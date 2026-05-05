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
				// Skip .git and other non-essential directories
				if (file === '.git' || file === '.gitignore') continue;
				walkDir(filePath, assetPath);
			} else {
				assets[assetPath] = new pulumi.asset.FileAsset(filePath);
			}
		}
	};

	walkDir(dirPath);
	return new pulumi.asset.AssetArchive(assets);
}

// Get configuration from Pulumi config (all required)
const sesReceiverEmail = config.require('sesReceiverEmail');
const githubDispatchToken = config.requireSecret('githubDispatchToken');
const allowedEmailAddresses = config.require('allowedEmailAddresses');
const sentryDsn = config.requireSecret('sentryDsn');

// 1. Create SNS Topic for SES
const sesEmailTopic = new aws.sns.Topic('ses-email-topic', {
	displayName: 'SES Email Receiver Topic',
	tags: {
		projectName: 'kotetsu'
	}
});

// 2. Create Lambda execution role
const lambdaRole = new aws.iam.Role('email-parser-lambda-role', {
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

// Attach basic Lambda execution policy
new aws.iam.RolePolicyAttachment('lambda-basic-execution', {
	role: lambdaRole.name,
	policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole
});

// Attach inline policy for CloudWatch Logs creation
new aws.iam.RolePolicy('lambda-logs-policy', {
	role: lambdaRole.id,
	policy: JSON.stringify({
		Version: '2012-10-17',
		Statement: [
			{
				Effect: 'Allow',
				Action: [
					'logs:CreateLogGroup',
					'logs:CreateLogStream',
					'logs:PutLogEvents'
				],
				Resource: 'arn:aws:logs:*:*:*'
			}
		]
	})
});

// 3. Create Lambda Function
// Package only compiled .js files (not .ts source, .json config, or subdirectories)
const emailParserLambda = new aws.lambda.Function('kotetsu-email-parser', {
	runtime: 'nodejs22.x',
	role: lambdaRole.arn,
	handler: 'index.handler',
	code: createLambdaCodeArchive('./lambda'),
	environment: {
		variables: {
			ALLOWED_EMAIL_ADDRESSES: allowedEmailAddresses,
			GITHUB_DISPATCH_TOKEN: githubDispatchToken,
			NODE_OPTIONS: '--import @sentry/aws-serverless/awslambda-auto',
			SENTRY_DSN: sentryDsn
		}
	},
	timeout: 30,
	memorySize: 256,
	tags: {
		projectName: 'kotetsu'
	}
});

// 4. Subscribe Lambda to SNS Topic
new aws.sns.TopicSubscription('email-parser-subscription', {
	topic: sesEmailTopic.arn,
	protocol: 'lambda',
	endpoint: emailParserLambda.arn
});

// 5. Grant Lambda permission to be invoked by SNS
new aws.lambda.Permission('allow-sns-invoke', {
	action: 'lambda:InvokeFunction',
	function: emailParserLambda.name,
	principal: 'sns.amazonaws.com',
	sourceArn: sesEmailTopic.arn
});

// 6. Add rule to existing "slackmail" SES Receipt Rule Set
new aws.ses.ReceiptRule('add-book-email-to-sns', {
	ruleSetName: 'main',
	name: 'add-book-email-to-sns',
	enabled: true,
	scanEnabled: true,
	recipients: [sesReceiverEmail],
	snsActions: [
		{
			position: 0,
			topicArn: sesEmailTopic.arn
		}
	]
});

// 7. Export outputs
export const topicArn = sesEmailTopic.arn;
export const lambdaFunctionName = emailParserLambda.name;
export const lambdaFunctionArn = emailParserLambda.arn;
export const sesReceiverAddress = sesReceiverEmail;
