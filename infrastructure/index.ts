import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import * as emailSetup from "./email-setup";

const config = new pulumi.Config();

// Cloudflare Account ID (required)
const accountId = config.require("cloudflareAccountId");

// Cloudflare Pages project name
const projectName = "kotetsu";

// Custom domain
const customDomain = "kotetsu.rindrics.com";

// Fetch existing Pages domain (read-only, managed via Cloudflare console)
const pagesDomain = cloudflare.getPagesDomain({
    accountId: accountId,
    projectName: projectName,
    domainName: customDomain,
});

// Export the custom domain info
export const domainName = pagesDomain.then(d => d.domainName);
export const status = pagesDomain.then(d => d.status);

// Export SES/Lambda email setup
export const emailTopicArn = emailSetup.topicArn;
export const emailLambdaFunctionName = emailSetup.lambdaFunctionName;
export const emailLambdaFunctionArn = emailSetup.lambdaFunctionArn;
export const emailReceiverAddress = emailSetup.sesReceiverAddress;
