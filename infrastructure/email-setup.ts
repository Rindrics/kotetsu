import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

const config = new pulumi.Config();

// Get configuration from Pulumi config
const sesReceiverEmail = config.get('sesReceiverEmail') || 'add@kotetsu.rindrics.com';
const githubDispatchToken = config.requireSecret('githubDispatchToken');
const allowedEmailAddresses = config.require('allowedEmailAddresses');

// 1. Create SNS Topic for SES
const sesEmailTopic = new aws.sns.Topic('ses-email-topic', {
	displayName: 'SES Email Receiver Topic'
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
	})
});

// Attach basic Lambda execution policy
new aws.iam.RolePolicyAttachment('lambda-basic-execution', {
	role: lambdaRole.name,
	policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole
});

// 3. Create Lambda Function
// Lambda code is in infrastructure/lambda directory
// Pulumi will automatically package it
const emailParserLambda = new aws.lambda.Function('email-parser', {
	runtime: 'nodejs18.x',
	role: lambdaRole.arn,
	handler: 'index.handler',
	code: new pulumi.asset.FileArchive('./lambda'),
	environment: {
		variables: {
			ALLOWED_EMAIL_ADDRESSES: allowedEmailAddresses,
			GITHUB_DISPATCH_TOKEN: githubDispatchToken
		}
	},
	timeout: 30,
	memorySize: 256
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

// 6. Create SES Receipt Rule Set
const ruleSet = new aws.ses.ReceiptRuleSet('kotetsu-rules', {
	ruleSetName: 'kotetsu-email-receiver'
});

// Activate the rule set
new aws.ses.ActiveReceiptRuleSet('kotetsu-rules-active', {
	ruleSetName: ruleSet.ruleSetName
});

// 7. Create SES Receipt Rule
new aws.ses.ReceiptRule('email-to-sns', {
	ruleSetName: ruleSet.ruleSetName,
	name: 'forward-email-to-sns',
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

// 8. Export outputs
export const topicArn = sesEmailTopic.arn;
export const lambdaFunctionName = emailParserLambda.name;
export const lambdaFunctionArn = emailParserLambda.arn;
export const ruleSetName = ruleSet.ruleSetName;
export const sesReceiverAddress = sesReceiverEmail;
