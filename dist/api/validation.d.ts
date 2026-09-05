import { z } from "zod";
import { Request, Response, NextFunction } from "express";
/**
 * Generic validation middleware that validates request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export declare const validateRequest: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Validation middleware for request params (URL path parameters)
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export declare const validateQuery: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateParams: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Common schema for vault account ID in URL params
 */
export declare const vaultAccountIdParamsSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
}, z.core.$strip>;
/**
 * Schema for pool ID in URL params
 */
export declare const poolIdParamsSchema: z.ZodObject<{
    poolId: z.ZodString;
}, z.core.$strip>;
/**
 * Schema for credential params
 */
export declare const credentialParamsSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
    credential: z.ZodString;
}, z.core.$strip>;
/**
 * Schema for transaction hash params
 */
export declare const hashParamsSchema: z.ZodObject<{
    hash: z.ZodString;
}, z.core.$strip>;
/**
 * Validation schema for transfer endpoint request body
 * Matches the transferOpts interface from types/iagon/general.ts
 */
export declare const transferRequestSchema: z.ZodObject<{
    recipientAddress: z.ZodOptional<z.ZodString>;
    recipientVaultAccountId: z.ZodOptional<z.ZodString>;
    recipientIndex: z.ZodOptional<z.ZodNumber>;
    tokenPolicyId: z.ZodString;
    tokenName: z.ZodString;
    requiredTokenAmount: z.ZodNumber;
    minRecipientLovelace: z.ZodOptional<z.ZodNumber>;
    minChangeLovelace: z.ZodOptional<z.ZodNumber>;
    index: z.ZodOptional<z.ZodNumber>;
    vaultAccountId: z.ZodString;
}, z.core.$strip>;
export type TransferRequest = z.infer<typeof transferRequestSchema>;
/**
 * Validation schema for fee estimation endpoint request body
 * Similar to transferRequestSchema but with grossAmount option
 */
export declare const feeEstimationRequestSchema: z.ZodObject<{
    recipientAddress: z.ZodOptional<z.ZodString>;
    recipientVaultAccountId: z.ZodOptional<z.ZodString>;
    recipientIndex: z.ZodOptional<z.ZodNumber>;
    tokenPolicyId: z.ZodString;
    tokenName: z.ZodString;
    requiredTokenAmount: z.ZodNumber;
    index: z.ZodOptional<z.ZodNumber>;
    grossAmount: z.ZodOptional<z.ZodBoolean>;
    vaultAccountId: z.ZodString;
}, z.core.$strip>;
export type CntFeeEstimationRequest = z.infer<typeof feeEstimationRequestSchema>;
export declare const adaTransferRequestSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
    lovelaceAmount: z.ZodNumber;
    recipientAddress: z.ZodOptional<z.ZodString>;
    recipientVaultAccountId: z.ZodOptional<z.ZodString>;
    recipientIndex: z.ZodOptional<z.ZodNumber>;
    index: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type AdaTransferRequest = z.infer<typeof adaTransferRequestSchema>;
export declare const adaFeeEstimationRequestSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
    lovelaceAmount: z.ZodNumber;
    recipientAddress: z.ZodOptional<z.ZodString>;
    recipientVaultAccountId: z.ZodOptional<z.ZodString>;
    recipientIndex: z.ZodOptional<z.ZodNumber>;
    index: z.ZodOptional<z.ZodNumber>;
    grossAmount: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type AdaFeeEstimationRequest = z.infer<typeof adaFeeEstimationRequestSchema>;
export declare const multiTokenTransferRequestSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
    tokens: z.ZodArray<z.ZodObject<{
        tokenPolicyId: z.ZodString;
        tokenName: z.ZodString;
        amount: z.ZodNumber;
    }, z.core.$strip>>;
    recipientAddress: z.ZodOptional<z.ZodString>;
    recipientVaultAccountId: z.ZodOptional<z.ZodString>;
    recipientIndex: z.ZodOptional<z.ZodNumber>;
    index: z.ZodOptional<z.ZodNumber>;
    lovelaceAmount: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type MultiTokenTransferRequest = z.infer<typeof multiTokenTransferRequestSchema>;
export declare const multiTokenFeeEstimationRequestSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
    tokens: z.ZodArray<z.ZodObject<{
        tokenPolicyId: z.ZodString;
        tokenName: z.ZodString;
        amount: z.ZodNumber;
    }, z.core.$strip>>;
    recipientAddress: z.ZodOptional<z.ZodString>;
    recipientVaultAccountId: z.ZodOptional<z.ZodString>;
    recipientIndex: z.ZodOptional<z.ZodNumber>;
    index: z.ZodOptional<z.ZodNumber>;
    lovelaceAmount: z.ZodOptional<z.ZodNumber>;
    grossAmount: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type MultiTokenFeeEstimationRequest = z.infer<typeof multiTokenFeeEstimationRequestSchema>;
export declare const consolidateUtxosRequestSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
    index: z.ZodOptional<z.ZodNumber>;
    minUtxoCount: z.ZodOptional<z.ZodNumber>;
    batched: z.ZodOptional<z.ZodBoolean>;
    batchSize: z.ZodOptional<z.ZodNumber>;
    maxBatches: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ConsolidateUtxosRequest = z.infer<typeof consolidateUtxosRequestSchema>;
export declare const delegateToDRepRequestSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
    drepAction: z.ZodEnum<{
        "always-abstain": "always-abstain";
        "always-no-confidence": "always-no-confidence";
        "custom-drep": "custom-drep";
    }>;
    drepId: z.ZodOptional<z.ZodString>;
    fee: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type DelegateToDRepRequest = z.infer<typeof delegateToDRepRequestSchema>;
export declare const registerAsDRepRequestSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
    anchor: z.ZodOptional<z.ZodObject<{
        url: z.ZodString;
        dataHash: z.ZodString;
    }, z.core.$strip>>;
    depositAmount: z.ZodOptional<z.ZodNumber>;
    fee: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type RegisterAsDRepRequest = z.infer<typeof registerAsDRepRequestSchema>;
export declare const castVoteRequestSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
    governanceActionId: z.ZodObject<{
        txHash: z.ZodString;
        index: z.ZodNumber;
    }, z.core.$strip>;
    vote: z.ZodEnum<{
        yes: "yes";
        no: "no";
        abstain: "abstain";
    }>;
    anchor: z.ZodOptional<z.ZodObject<{
        url: z.ZodString;
        dataHash: z.ZodString;
    }, z.core.$strip>>;
    fee: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type CastVoteRequest = z.infer<typeof castVoteRequestSchema>;
export declare const registerStakingRequestSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
    index: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type RegisterStakingRequest = z.infer<typeof registerStakingRequestSchema>;
export declare const deregisterStakingRequestSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
}, z.core.$strip>;
export type DeregisterStakingRequest = z.infer<typeof deregisterStakingRequestSchema>;
export declare const delegateToPoolRequestSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
    poolId: z.ZodString;
}, z.core.$strip>;
export type DelegateToPoolRequest = z.infer<typeof delegateToPoolRequestSchema>;
export declare const withdrawRewardsRequestSchema: z.ZodObject<{
    vaultAccountId: z.ZodString;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type WithdrawRewardsRequest = z.infer<typeof withdrawRewardsRequestSchema>;
export declare const addressQuerySchema: z.ZodObject<{
    index: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export type AddressQuery = z.infer<typeof addressQuerySchema>;
export declare const txHistoryQuerySchema: z.ZodObject<{
    index: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    fromSlot: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type TxHistoryQuery = z.infer<typeof txHistoryQuerySchema>;
export declare const paginationQuerySchema: z.ZodObject<{
    limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
//# sourceMappingURL=validation.d.ts.map