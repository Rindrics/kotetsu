import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

const config = new pulumi.Config();

// Cloudflare Account ID (required)
const accountId = config.require("cloudflareAccountId");

// Cloudflare Pages project name
const projectName = "kotetsu";

// Custom domain to add
const customDomain = "kotetsu.rindrics.com";

// Add custom domain to Cloudflare Pages project
// Note: DNS records for rindrics.com are managed in a separate project
const pagesDomain = new cloudflare.PagesDomain("kotetsu-custom-domain", {
    accountId: accountId,
    projectName: projectName,
    name: customDomain,
});

// Export the custom domain
export const domainName = pagesDomain.name;
export const status = pagesDomain.status;
