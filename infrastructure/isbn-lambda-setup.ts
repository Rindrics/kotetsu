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

// 2. Create Lambda Function for ISBN Search
const isbnSearchLambda = new aws.lambda.Function('kotetsu-isbn-search', {
	runtime: 'nodejs22.x',
	role: isbnLambdaRole.arn,
	handler: 'isbn-search.handler',
	code: createLambdaCodeArchive('./lambda'),
	environment: {
		variables: {
			LAMBDA_JWT_SECRET: lambdaJwtSecret
		}
	},
	timeout: 30,
	memorySize: 512, // Higher memory for node-isbn and kuroshiro
	tags: {
		projectName: 'kotetsu'
	}
});

// 3. Create Function URL for direct HTTP invocation
const isbnLambdaUrl = new aws.lambda.FunctionUrl('isbn-search-url', {
	functionName: isbnSearchLambda.name,
	authorizationType: 'NONE', // Rely on JWT in request header for auth
	cors: {
		allowOrigins: ['*'],
		allowMethods: ['POST'],
		allowHeaders: ['Content-Type', 'Authorization'],
		maxAge: 86400
	}
});

// 4. Export outputs
export const functionUrl = isbnLambdaUrl.functionUrl;
export const functionArn = isbnSearchLambda.arn;
export const functionName = isbnSearchLambda.name;
