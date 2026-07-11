/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AuthCredentials = {
  __typename?: 'AuthCredentials';
  accessToken: Scalars['String']['output'];
  accessTokenExpiresAt: Scalars['String']['output'];
  refreshToken: Scalars['String']['output'];
};

export type DefaultVariation = {
  __typename?: 'DefaultVariation';
  auid: Scalars['ID']['output'];
  variationId: Scalars['ID']['output'];
};

export type Identity = {
  __typename?: 'Identity';
  auid: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addUsername: Usernames;
  changeDefaultUsername: Usernames;
  changePassword: Scalars['Boolean']['output'];
  changeUsername: Usernames;
  changeVariationDescription: Variation;
  changeVariationFirstName: Variation;
  changeVariationIcon: Variation;
  changeVariationLastName: Variation;
  changeVariationLocationId: Variation;
  changeVariationStatus: Variation;
  createUser: Identity;
  createVariation: Variation;
  generateToken: Token;
  login: AuthCredentials;
  loginWithTotp: AuthCredentials;
  refreshCredentials: AuthCredentials;
  removeUsername: Usernames;
  revokeCredentials: Scalars['Boolean']['output'];
  setDefaultVariation: DefaultVariation;
  startTotpEnrollment: TotpEnrollmentResponse;
  verifyTotpEnrollment: Scalars['Boolean']['output'];
};


export type MutationAddUsernameArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  username: Scalars['String']['input'];
};


export type MutationChangeDefaultUsernameArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  username: Scalars['String']['input'];
};


export type MutationChangePasswordArgs = {
  auid: Scalars['ID']['input'];
  newPassword: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationChangeUsernameArgs = {
  auid: Scalars['ID']['input'];
  newUsername: Scalars['String']['input'];
  oldUsername: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationChangeVariationDescriptionArgs = {
  auid: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeVariationFirstNameArgs = {
  auid: Scalars['ID']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeVariationIconArgs = {
  auid: Scalars['ID']['input'];
  icon?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeVariationLastNameArgs = {
  auid: Scalars['ID']['input'];
  lastName?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeVariationLocationIdArgs = {
  auid: Scalars['ID']['input'];
  locationId?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeVariationStatusArgs = {
  auid: Scalars['ID']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationCreateUserArgs = {
  contextAuid?: InputMaybe<Scalars['ID']['input']>;
  password: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  username: Scalars['String']['input'];
};


export type MutationCreateVariationArgs = {
  auid: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  locationId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationGenerateTokenArgs = {
  auid: Scalars['ID']['input'];
  password: Scalars['String']['input'];
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationLoginArgs = {
  auid: Scalars['ID']['input'];
  password: Scalars['String']['input'];
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationLoginWithTotpArgs = {
  code: Scalars['String']['input'];
  totpToken: Scalars['String']['input'];
};


export type MutationRefreshCredentialsArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationRemoveUsernameArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  username: Scalars['String']['input'];
};


export type MutationRevokeCredentialsArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationSetDefaultVariationArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationStartTotpEnrollmentArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationVerifyTotpEnrollmentArgs = {
  auid: Scalars['ID']['input'];
  code: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};

export type Query = {
  __typename?: 'Query';
  defaultVariation?: Maybe<DefaultVariation>;
  ownerByUsername?: Maybe<Scalars['ID']['output']>;
  user?: Maybe<User>;
  usernames?: Maybe<Usernames>;
  variations: Array<Variation>;
};


export type QueryDefaultVariationArgs = {
  auid: Scalars['ID']['input'];
};


export type QueryOwnerByUsernameArgs = {
  username: Scalars['String']['input'];
};


export type QueryUserArgs = {
  auid: Scalars['ID']['input'];
};


export type QueryUsernamesArgs = {
  auid: Scalars['ID']['input'];
};


export type QueryVariationsArgs = {
  auid: Scalars['ID']['input'];
};

export type Token = {
  __typename?: 'Token';
  id: Scalars['ID']['output'];
};

export type TotpEnrollmentResponse = {
  __typename?: 'TotpEnrollmentResponse';
  otpauthUrl: Scalars['String']['output'];
  secret: Scalars['String']['output'];
};

export type User = {
  __typename?: 'User';
  defaultVariation?: Maybe<DefaultVariation>;
  identity: Identity;
  usernames: Usernames;
};

export type Usernames = {
  __typename?: 'Usernames';
  auid: Scalars['ID']['output'];
  defaultUsername: Scalars['String']['output'];
  usernames: Array<Scalars['String']['output']>;
};

export type Variation = {
  __typename?: 'Variation';
  auid: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  locationId?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
};

export type UserDetailsQueryVariables = Exact<{
  auid: string | number;
}>;


export type UserDetailsQuery = { usernames: { defaultUsername: string } | null, defaultVariation: { variationId: string } | null, variations: Array<{ id: string, firstName: string | null, lastName: string | null }> };


export const UserDetailsDocument = gql`
    query UserDetails($auid: ID!) {
  usernames(auid: $auid) {
    defaultUsername
  }
  defaultVariation(auid: $auid) {
    variationId
  }
  variations(auid: $auid) {
    id
    firstName
    lastName
  }
}
    `;
export type Requester<C = {}> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>
export function getSdk<C>(requester: Requester<C>) {
  return {
    UserDetails(variables: UserDetailsQueryVariables, options?: C): Promise<UserDetailsQuery> {
      return requester<UserDetailsQuery, UserDetailsQueryVariables>(UserDetailsDocument, variables, options) as Promise<UserDetailsQuery>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;