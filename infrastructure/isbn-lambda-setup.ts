import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as fs from 'fs';
import * as path from 'path';

const config = new pulumi.Config('kotetsu');

// Helper function to create Lambda code archive from directory
function createLambdaCodeArchive(dirPath: string): pulumi.asset.AssetArchive {
	const assets: { [key: string]: pulumi.asset.Asset } = {};

	const walkDir = (dir: string, prefix: string = '') => {
		for (const file of fs.readdirSync(dir)) {
			const filePath = path.join(dir, file);
			const assetPath = prefix ? `${prefix}/${file}` : file;

			if (fs.statSync(filePath).isDirectory()) {
				// Skip .git and node_modules (will be installed fresh)
				if (file === '.git' || file === '.gitignore' || file === 'node_modules') continue;
				walkDir(filePath, assetPath);
			} else {
				assets[assetPath] = new pulumi.asset.FileAsset(filePath);
			}
		}
	};

	walkDir(dirPath);
	return new pulumi.asset.AssetArchive(assets);
}

// Get configuration from Pulumi config
const lambdaJwtSecret = config.requireSecret('lambdaJwtSecret');

// 1. Create Lambda execution role
const isbnLambdaRole = new aws.iam.Role('isbn-search-lambda-role', {
	assumeRolePolicy: JSON.stringify({
		Version: '2012-10-17',
		Statement: [
			{
				Action: 'sts:AssumeRole',
				Effect: 'Allow',
				Principal: {
					Service: 'lambda.amazonaws.com'
				}
			}
		]
	}),
	tags: {
		projectName: 'kotetsu'
	}
});

// Attach basic Lambda execution policy for logs
new aws.iam.RolePolicyAttachment('isbn-lambda-basic-execution', {
	role: isbnLambdaRole.name,
	policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole
});

// 2. Create JWT token authorizer Lambda
const jwtAuthorizerLambda = new aws.lambda.Function('kotetsu-jwt-authorizer', {
	runtime: 'nodejs22.x',
	role: isbnLambdaRole.arn,
	handler: 'jwt-authorizer.handler',
	code: createLambdaCodeArchive('./lambda'),
	environment: {
		variables: {
			LAMBDA_JWT_SECRET: lambdaJwtSecret
		}
	},
	timeout: 5,
	memorySize: 128,
	tags: {
		projectName: 'kotetsu'
	}
});

// 3. Create ISBN Search Lambda
const isbnSearchLambda = new aws.lambda.Function('kotetsu-isbn-search', {
	runtime: 'nodejs22.x',
	role: isbnLambdaRole.arn,
	handler: 'isbn-search.handler',
	code: createLambdaCodeArchive('./lambda'),
	timeout: 30,
	memorySize: 512,
	tags: {
		projectName: 'kotetsu'
	}
});

// 4. Create API Gateway
const isbnApi = new aws.apigateway.RestApi('isbn-search-api', {
	description: 'ISBN search and romanization API',
	endpointConfiguration: {
		types: 'REGIONAL'
	},
	tags: {
		projectName: 'kotetsu'
	}
});

// Get region and account ID
const currentRegion = aws.getRegion();
const currentAccount = aws.getCallerIdentity();

// 5. Create Token Authorizer
const tokenAuthorizer = new aws.apigateway.Authorizer('jwt-token-authorizer', {
	restApi: isbnApi.id,
	authorizerUri: pulumi.interpolate`arn:aws:apigateway:${currentRegion.then(r => r.name)}:lambda:path/2015-03-31/functions/${jwtAuthorizerLambda.arn}/invocations`,
	authorizerCredentials: isbnLambdaRole.arn,
	authorizerResultTtlInSeconds: 300,
	type: 'TOKEN',
	identitySource: 'method.request.header.Authorization'
});

// 6. Allow API Gateway to invoke authorizer
new aws.lambda.Permission('allow-apigw-invoke-authorizer', {
	action: 'lambda:InvokeFunction',
	function: jwtAuthorizerLambda.name,
	principal: 'apigateway.amazonaws.com',
	sourceArn: pulumi.interpolate`arn:aws:execute-api:${currentRegion.then(r => r.name)}:${currentAccount.then(a => a.accountId)}:${isbnApi.id}/*`
});

// 7. Allow API Gateway to invoke ISBN Search Lambda
new aws.lambda.Permission('allow-apigw-invoke-isbn-search', {
	action: 'lambda:InvokeFunction',
	function: isbnSearchLambda.name,
	principal: 'apigateway.amazonaws.com',
	sourceArn: pulumi.interpolate`arn:aws:execute-api:${currentRegion.then(r => r.name)}:${currentAccount.then(a => a.accountId)}:${isbnApi.id}/*`
});

// 8. Create /isbn-search resource and method
const isbnSearchResource = new aws.apigateway.Resource('isbn-search-resource', {
	restApi: isbnApi.id,
	parentId: isbnApi.rootResourceId,
	pathPart: 'isbn-search'
});

const isbnSearchMethod = new aws.apigateway.Method('isbn-search-get', {
	restApi: isbnApi.id,
	resourceId: isbnSearchResource.id,
	httpMethod: 'GET',
	authorization: 'CUSTOM',
	authorizerId: tokenAuthorizer.id
});

const isbnSearchIntegration = new aws.apigateway.Integration('isbn-search-integration', {
	restApi: isbnApi.id,
	resourceId: isbnSearchResource.id,
	httpMethod: 'GET',
	type: 'AWS_PROXY',
	integrationHttpMethod: 'POST',
	uri: pulumi.interpolate`arn:aws:apigateway:${currentRegion.then(r => r.name)}:lambda:path/2015-03-31/functions/${isbnSearchLambda.arn}/invocations`
}, { dependsOn: [isbnSearchMethod] });

// 9. Create /romanize resource and method
const romanizeResource = new aws.apigateway.Resource('romanize-resource', {
	restApi: isbnApi.id,
	parentId: isbnApi.rootResourceId,
	pathPart: 'romanize'
});

const romanizeMethod = new aws.apigateway.Method('romanize-get', {
	restApi: isbnApi.id,
	resourceId: romanizeResource.id,
	httpMethod: 'GET',
	authorization: 'CUSTOM',
	authorizerId: tokenAuthorizer.id
});

const romanizeIntegration = new aws.apigateway.Integration('romanize-integration', {
	restApi: isbnApi.id,
	resourceId: romanizeResource.id,
	httpMethod: 'GET',
	type: 'AWS_PROXY',
	integrationHttpMethod: 'POST',
	uri: pulumi.interpolate`arn:aws:apigateway:${currentRegion.then(r => r.name)}:lambda:path/2015-03-31/functions/${isbnSearchLambda.arn}/invocations`
}, { dependsOn: [romanizeMethod] });

// 10. Create deployment (depends on all methods and integrations)
const deployment = new aws.apigateway.Deployment('isbn-api-deployment', {
	restApi: isbnApi.id,
	stageName: ''
}, { dependsOn: [isbnSearchMethod, isbnSearchIntegration, romanizeMethod, romanizeIntegration] });

// 11. Create prod stage
const stage = new aws.apigateway.Stage('prod', {
	deployment: deployment.id,
	restApi: isbnApi.id,
	stageName: 'prod'
});

// 12. Export outputs
export const apiUrl = stage.invokeUrl;
export const isbnSearchFunctionArn = isbnSearchLambda.arn;
export const isbnSearchFunctionName = isbnSearchLambda.name;
