/**
 * API Gateway Token Authorizer for JWT validation
 *
 * Validates JWT Bearer token and returns IAM policy
 * Caches result in API Gateway for 300 seconds
 */

import { CustomAuthorizerHandler } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.LAMBDA_JWT_SECRET || 'secret';

/**
 * Parse Bearer token from Authorization header
 */
function getToken(event: any): string {
	const authHeader = event.authorizationToken;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw new Error('Unauthorized');
	}
	return authHeader.slice(7);
}

/**
 * Generate IAM policy
 */
function generatePolicy(principalId: string, effect: 'Allow' | 'Deny', resource: string) {
	return {
		principalId,
		policyDocument: {
			Version: '2012-10-17',
			Statement: [
				{
					Action: 'execute-api:Invoke',
					Effect: effect,
					Resource: resource
				}
			]
		}
	};
}

/**
 * Token Authorizer Handler
 */
export const handler: CustomAuthorizerHandler = async (event: any) => {
	console.log('Authorizer event:', JSON.stringify(event, null, 2));

	try {
		const token = getToken(event);

		// Verify JWT
		const decoded = jwt.verify(token, JWT_SECRET);
		console.log('Token verified:', decoded);

		// Generate Allow policy
		const resource = event.methodArn;
		return generatePolicy(JSON.stringify(decoded), 'Allow', resource);
	} catch (error) {
		console.error('Authorization failed:', error instanceof Error ? error.message : error);
		throw new Error('Unauthorized');
	}
};
