/* 
  This File Defines The Database Used To Store Information Accross The Site
*/

import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

// Defines The Database Schema
// Id Is Made Automaticly, So We Do Not Need To Define It 
const schema = a.schema({
  // Defines Table For Storing User Settings
  UserSettings: a
    .model({
      overSpendingNotification: a.boolean(),
      lowBalanceNotification: a.boolean(),
      largeTransactionNotification: a.boolean(),
      lowBalanceThreshold: a.integer()
    })
    // allow.owner Means That Users Can Changes These Values
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // Uses Cognito user Pools For Auth
    // Means That Users Can Edit Their Own Information Without An Auth Account
    defaultAuthorizationMode: 'userPool',
  },
});