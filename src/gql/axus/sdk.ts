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
  auid: Scalars['ID']['output'];
  refreshToken: Scalars['String']['output'];
};

export type AuthenticatedToken = {
  __typename?: 'AuthenticatedToken';
  auid: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
};

export type CreatedUser = {
  __typename?: 'CreatedUser';
  auid: Scalars['ID']['output'];
  token: Token;
};

export type DefaultVariation = {
  __typename?: 'DefaultVariation';
  auid: Scalars['ID']['output'];
  variationId: Scalars['ID']['output'];
};

export type Description = {
  __typename?: 'Description';
  text?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  variationId: Scalars['ID']['output'];
};

export type ExternalAuthenticationInput = {
  clientId: Scalars['String']['input'];
  providerId: Scalars['String']['input'];
  refreshToken: Scalars['String']['input'];
};

export type ExternalIdentity = {
  __typename?: 'ExternalIdentity';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  providerId: Scalars['String']['output'];
};

export type ExternalIdentityAccessTokenResponse = {
  __typename?: 'ExternalIdentityAccessTokenResponse';
  accessToken: Scalars['String']['output'];
  expiresIn?: Maybe<Scalars['Int']['output']>;
  scopes: Array<Scalars['String']['output']>;
  tokenType?: Maybe<Scalars['String']['output']>;
};

export type Identity = {
  __typename?: 'Identity';
  auid: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptParent: Parents;
  addUsername: Usernames;
  changeDefaultUsername: Usernames;
  changeDescription: Description;
  changeName: Name;
  changeStatus: Status;
  changeUsername: Usernames;
  changeVariationIcon: Variation;
  changeVariationLocationId: Variation;
  clearDescription: Description;
  clearStatus: Status;
  createUser: CreatedUser;
  createVariation: Variation;
  deletePasskey: Scalars['Boolean']['output'];
  finishPasskeyRegistration: Scalars['Boolean']['output'];
  linkExternalIdentity: ExternalIdentity;
  loginWithExternalIdentity: AuthenticatedToken;
  loginWithPasskey: AuthenticatedToken;
  loginWithPassword: Token;
  loginWithToken: Token;
  loginWithTotp: AuthenticatedToken;
  refreshCredentials: AuthCredentials;
  removeUsername: Usernames;
  reorderParents: Parents;
  requestParent: Parents;
  revokeCredentials: Scalars['Boolean']['output'];
  setDefaultVariation: DefaultVariation;
  setPassword: Scalars['Boolean']['output'];
  startPasskeyLogin: PasskeyCeremony;
  startPasskeyRegistration: PasskeyCeremony;
  startTotpEnrollment: TotpEnrollmentResponse;
  unlinkExternalIdentity: Scalars['Boolean']['output'];
  updatePasskeyName: Scalars['Boolean']['output'];
  verifyTotpEnrollment: Scalars['Boolean']['output'];
  wrapTokenInCredentials: AuthCredentials;
};


export type MutationAcceptParentArgs = {
  auid: Scalars['ID']['input'];
  parentAuid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
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


export type MutationChangeDescriptionArgs = {
  auid: Scalars['ID']['input'];
  text?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeNameArgs = {
  auid: Scalars['ID']['input'];
  elements: Array<NameElementInput>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeStatusArgs = {
  auid: Scalars['ID']['input'];
  durationMinutes?: InputMaybe<Scalars['Int']['input']>;
  emoji?: InputMaybe<Scalars['String']['input']>;
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeUsernameArgs = {
  auid: Scalars['ID']['input'];
  newUsername: Scalars['String']['input'];
  oldUsername: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationChangeVariationIconArgs = {
  auid: Scalars['ID']['input'];
  icon?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeVariationLocationIdArgs = {
  auid: Scalars['ID']['input'];
  locationId?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationClearDescriptionArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationClearStatusArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationCreateUserArgs = {
  contextAuid?: InputMaybe<Scalars['ID']['input']>;
  registrationKey: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateVariationArgs = {
  auid: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  locationId?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDeletePasskeyArgs = {
  auid: Scalars['ID']['input'];
  credentialId: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationFinishPasskeyRegistrationArgs = {
  auid: Scalars['ID']['input'];
  challengeId: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  responseJson: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationLinkExternalIdentityArgs = {
  auid: Scalars['ID']['input'];
  authentication: ExternalAuthenticationInput;
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationLoginWithExternalIdentityArgs = {
  authentication: ExternalAuthenticationInput;
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationLoginWithPasskeyArgs = {
  challengeId: Scalars['ID']['input'];
  responseJson: Scalars['String']['input'];
};


export type MutationLoginWithPasswordArgs = {
  auid: Scalars['ID']['input'];
  password: Scalars['String']['input'];
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationLoginWithTokenArgs = {
  auid: Scalars['ID']['input'];
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
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


export type MutationReorderParentsArgs = {
  auid: Scalars['ID']['input'];
  parentAuids: Array<Scalars['ID']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRequestParentArgs = {
  auid: Scalars['ID']['input'];
  parentAuid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRevokeCredentialsArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationSetDefaultVariationArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationSetPasswordArgs = {
  auid: Scalars['ID']['input'];
  password: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationStartPasskeyLoginArgs = {
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
  relyingPartyId: Scalars['String']['input'];
};


export type MutationStartPasskeyRegistrationArgs = {
  auid: Scalars['ID']['input'];
  displayName?: InputMaybe<Scalars['String']['input']>;
  relyingPartyId: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationStartTotpEnrollmentArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUnlinkExternalIdentityArgs = {
  auid: Scalars['ID']['input'];
  externalIdentityId: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdatePasskeyNameArgs = {
  auid: Scalars['ID']['input'];
  credentialId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationVerifyTotpEnrollmentArgs = {
  auid: Scalars['ID']['input'];
  code: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationWrapTokenInCredentialsArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};

export type Name = {
  __typename?: 'Name';
  displayName: Scalars['String']['output'];
  elements: Array<NameElement>;
  variationId: Scalars['ID']['output'];
};

export type NameElement = {
  __typename?: 'NameElement';
  partType?: Maybe<NamePartType>;
  separatorType?: Maybe<NameSeparatorType>;
  value?: Maybe<Scalars['String']['output']>;
};

export type NameElementInput = {
  partType?: InputMaybe<NamePartType>;
  separatorType?: InputMaybe<NameSeparatorType>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export enum NamePartType {
  Credential = 'CREDENTIAL',
  FamilyName = 'FAMILY_NAME',
  Generation = 'GENERATION',
  GivenName = 'GIVEN_NAME',
  Title = 'TITLE',
  Unstructured = 'UNSTRUCTURED'
}

export enum NameSeparatorType {
  Apostrophe = 'APOSTROPHE',
  CommaSpace = 'COMMA_SPACE',
  Hyphen = 'HYPHEN',
  Space = 'SPACE'
}

export type PaginatedIdentities = {
  __typename?: 'PaginatedIdentities';
  items: Array<Identity>;
};

export type Parent = {
  __typename?: 'Parent';
  auid: Scalars['ID']['output'];
  status: ParentStatus;
};

export enum ParentStatus {
  Accepted = 'ACCEPTED',
  Pending = 'PENDING'
}

export type Parents = {
  __typename?: 'Parents';
  auid: Scalars['ID']['output'];
  parents: Array<Parent>;
};

export type PasskeyCeremony = {
  __typename?: 'PasskeyCeremony';
  challengeId: Scalars['ID']['output'];
  optionsJson: Scalars['String']['output'];
};

export type PasskeyCredential = {
  __typename?: 'PasskeyCredential';
  auid: Scalars['ID']['output'];
  backedUp: Scalars['Boolean']['output'];
  backupEligible: Scalars['Boolean']['output'];
  createdAt: Scalars['String']['output'];
  credentialId: Scalars['ID']['output'];
  lastUsedAt?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  transports: Array<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  defaultVariation?: Maybe<DefaultVariation>;
  description?: Maybe<Description>;
  externalIdentities: Array<ExternalIdentity>;
  externalIdentityAccessToken: ExternalIdentityAccessTokenResponse;
  identities: PaginatedIdentities;
  name?: Maybe<Name>;
  ownerByUsername?: Maybe<Scalars['ID']['output']>;
  parents?: Maybe<Parents>;
  passkeys: Array<PasskeyCredential>;
  status?: Maybe<Status>;
  user?: Maybe<User>;
  usernames?: Maybe<Usernames>;
  variations: Array<Variation>;
};


export type QueryDefaultVariationArgs = {
  auid: Scalars['ID']['input'];
};


export type QueryDescriptionArgs = {
  variationId: Scalars['ID']['input'];
};


export type QueryExternalIdentitiesArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryExternalIdentityAccessTokenArgs = {
  auid: Scalars['ID']['input'];
  externalIdentityId: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryIdentitiesArgs = {
  contextAuid: Scalars['ID']['input'];
  cursor?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  recursive?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryNameArgs = {
  variationId: Scalars['ID']['input'];
};


export type QueryOwnerByUsernameArgs = {
  username: Scalars['String']['input'];
};


export type QueryParentsArgs = {
  auid: Scalars['ID']['input'];
};


export type QueryPasskeysArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryStatusArgs = {
  variationId: Scalars['ID']['input'];
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

export type Status = {
  __typename?: 'Status';
  emoji?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['String']['output']>;
  isExpired: Scalars['Boolean']['output'];
  text?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  variationId: Scalars['ID']['output'];
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
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  locationId?: Maybe<Scalars['String']['output']>;
};

export type NameElementInput = {
  partType?: NamePartType | null | undefined;
  separatorType?: NameSeparatorType | null | undefined;
  value?: string | null | undefined;
};

export type NamePartType =
  | 'CREDENTIAL'
  | 'FAMILY_NAME'
  | 'GENERATION'
  | 'GIVEN_NAME'
  | 'TITLE'
  | 'UNSTRUCTURED';

export type NameSeparatorType =
  | 'APOSTROPHE'
  | 'COMMA_SPACE'
  | 'HYPHEN'
  | 'SPACE';

export type LoginWithPasswordMutationVariables = Exact<{
  auid: string | number;
  password: string;
  permissions?: Array<string> | string | null | undefined;
}>;


export type LoginWithPasswordMutation = { loginWithPassword: { id: string } };

export type WrapTokenInCredentialsMutationVariables = Exact<{
  auid: string | number;
  tokenId?: string | null | undefined;
}>;


export type WrapTokenInCredentialsMutation = { wrapTokenInCredentials: { auid: string, accessToken: string, refreshToken: string, accessTokenExpiresAt: string } };

export type RefreshCredentialsMutationVariables = Exact<{
  refreshToken: string;
}>;


export type RefreshCredentialsMutation = { refreshCredentials: { accessToken: string, refreshToken: string, accessTokenExpiresAt: string } };

export type RevokeCredentialsMutationVariables = Exact<{
  refreshToken: string;
}>;


export type RevokeCredentialsMutation = { revokeCredentials: boolean };

export type CreateUserMutationVariables = Exact<{
  contextAuid?: string | number | null | undefined;
  tokenId?: string | null | undefined;
  registrationKey: string | number;
}>;


export type CreateUserMutation = { createUser: { auid: string, token: { id: string } } };

export type SetPasswordMutationVariables = Exact<{
  auid: string | number;
  tokenId?: string | null | undefined;
  password: string;
}>;


export type SetPasswordMutation = { setPassword: boolean };

export type OwnerByUsernameQueryVariables = Exact<{
  username: string;
}>;


export type OwnerByUsernameQuery = { ownerByUsername: string | null };

export type UserQueryVariables = Exact<{
  auid: string | number;
}>;


export type UserQuery = { user: { identity: { auid: string, id: string }, usernames: { auid: string, usernames: Array<string>, defaultUsername: string }, defaultVariation: { auid: string, variationId: string } | null } | null };

export type UsernamesQueryVariables = Exact<{
  auid: string | number;
}>;


export type UsernamesQuery = { usernames: { auid: string, usernames: Array<string>, defaultUsername: string } | null };

export type VariationsQueryVariables = Exact<{
  auid: string | number;
}>;


export type VariationsQuery = { variations: Array<{ id: string, auid: string, locationId: string | null, icon: string | null, createdAt: string }> };

export type VariationNameQueryVariables = Exact<{
  variationId: string | number;
}>;


export type VariationNameQuery = { name: { variationId: string, displayName: string, elements: Array<{ partType: NamePartType | null, value: string | null, separatorType: NameSeparatorType | null }> } | null };

export type VariationDescriptionQueryVariables = Exact<{
  variationId: string | number;
}>;


export type VariationDescriptionQuery = { description: { variationId: string, text: string | null, updatedAt: string } | null };

export type VariationStatusQueryVariables = Exact<{
  variationId: string | number;
}>;


export type VariationStatusQuery = { status: { variationId: string, text: string | null, emoji: string | null, expiresAt: string | null, updatedAt: string, isExpired: boolean } | null };

export type DefaultVariationQueryVariables = Exact<{
  auid: string | number;
}>;


export type DefaultVariationQuery = { defaultVariation: { auid: string, variationId: string } | null };

export type AddUsernameMutationVariables = Exact<{
  auid: string | number;
  username: string;
}>;


export type AddUsernameMutation = { addUsername: { auid: string, usernames: Array<string>, defaultUsername: string } };

export type RemoveUsernameMutationVariables = Exact<{
  auid: string | number;
  username: string;
}>;


export type RemoveUsernameMutation = { removeUsername: { auid: string, usernames: Array<string>, defaultUsername: string } };

export type ChangeDefaultUsernameMutationVariables = Exact<{
  auid: string | number;
  username: string;
}>;


export type ChangeDefaultUsernameMutation = { changeDefaultUsername: { auid: string, usernames: Array<string>, defaultUsername: string } };

export type CreateVariationMutationVariables = Exact<{
  auid: string | number;
  description?: string | null | undefined;
  locationId?: string | null | undefined;
  icon?: string | null | undefined;
}>;


export type CreateVariationMutation = { createVariation: { id: string, auid: string, locationId: string | null, icon: string | null, createdAt: string } };

export type ChangeNameMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  elements: Array<NameElementInput> | NameElementInput;
}>;


export type ChangeNameMutation = { changeName: { variationId: string, displayName: string, elements: Array<{ partType: NamePartType | null, value: string | null, separatorType: NameSeparatorType | null }> } };

export type ChangeDescriptionMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  text?: string | null | undefined;
}>;


export type ChangeDescriptionMutation = { changeDescription: { variationId: string, text: string | null, updatedAt: string } };

export type ClearDescriptionMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
}>;


export type ClearDescriptionMutation = { clearDescription: { variationId: string, text: string | null, updatedAt: string } };

export type ChangeStatusMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  text?: string | null | undefined;
  emoji?: string | null | undefined;
  expiresAt?: string | null | undefined;
  durationMinutes?: number | null | undefined;
}>;


export type ChangeStatusMutation = { changeStatus: { variationId: string, text: string | null, emoji: string | null, expiresAt: string | null, updatedAt: string, isExpired: boolean } };

export type ClearStatusMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
}>;


export type ClearStatusMutation = { clearStatus: { variationId: string, text: string | null, emoji: string | null, expiresAt: string | null, updatedAt: string, isExpired: boolean } };

export type ChangeVariationLocationIdMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  locationId?: string | null | undefined;
}>;


export type ChangeVariationLocationIdMutation = { changeVariationLocationId: { id: string, locationId: string | null } };

export type ChangeVariationIconMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  icon?: string | null | undefined;
}>;


export type ChangeVariationIconMutation = { changeVariationIcon: { id: string, icon: string | null } };

export type SetDefaultVariationMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
}>;


export type SetDefaultVariationMutation = { setDefaultVariation: { auid: string, variationId: string } };

export type UserDetailsQueryVariables = Exact<{
  auid: string | number;
}>;


export type UserDetailsQuery = { usernames: { defaultUsername: string } | null, defaultVariation: { variationId: string } | null, variations: Array<{ id: string }> };


export const LoginWithPasswordDocument = gql`
    mutation LoginWithPassword($auid: ID!, $password: String!, $permissions: [String!]) {
  loginWithPassword(auid: $auid, password: $password, permissions: $permissions) {
    id
  }
}
    `;
export const WrapTokenInCredentialsDocument = gql`
    mutation WrapTokenInCredentials($auid: ID!, $tokenId: String) {
  wrapTokenInCredentials(auid: $auid, tokenId: $tokenId) {
    auid
    accessToken
    refreshToken
    accessTokenExpiresAt
  }
}
    `;
export const RefreshCredentialsDocument = gql`
    mutation RefreshCredentials($refreshToken: String!) {
  refreshCredentials(refreshToken: $refreshToken) {
    accessToken
    refreshToken
    accessTokenExpiresAt
  }
}
    `;
export const RevokeCredentialsDocument = gql`
    mutation RevokeCredentials($refreshToken: String!) {
  revokeCredentials(refreshToken: $refreshToken)
}
    `;
export const CreateUserDocument = gql`
    mutation CreateUser($contextAuid: ID, $tokenId: String, $registrationKey: ID!) {
  createUser(
    contextAuid: $contextAuid
    tokenId: $tokenId
    registrationKey: $registrationKey
  ) {
    auid
    token {
      id
    }
  }
}
    `;
export const SetPasswordDocument = gql`
    mutation SetPassword($auid: ID!, $tokenId: String, $password: String!) {
  setPassword(auid: $auid, tokenId: $tokenId, password: $password)
}
    `;
export const OwnerByUsernameDocument = gql`
    query OwnerByUsername($username: String!) {
  ownerByUsername(username: $username)
}
    `;
export const UserDocument = gql`
    query User($auid: ID!) {
  user(auid: $auid) {
    identity {
      auid
      id
    }
    usernames {
      auid
      usernames
      defaultUsername
    }
    defaultVariation {
      auid
      variationId
    }
  }
}
    `;
export const UsernamesDocument = gql`
    query Usernames($auid: ID!) {
  usernames(auid: $auid) {
    auid
    usernames
    defaultUsername
  }
}
    `;
export const VariationsDocument = gql`
    query Variations($auid: ID!) {
  variations(auid: $auid) {
    id
    auid
    locationId
    icon
    createdAt
  }
}
    `;
export const VariationNameDocument = gql`
    query VariationName($variationId: ID!) {
  name(variationId: $variationId) {
    variationId
    elements {
      partType
      value
      separatorType
    }
    displayName
  }
}
    `;
export const VariationDescriptionDocument = gql`
    query VariationDescription($variationId: ID!) {
  description(variationId: $variationId) {
    variationId
    text
    updatedAt
  }
}
    `;
export const VariationStatusDocument = gql`
    query VariationStatus($variationId: ID!) {
  status(variationId: $variationId) {
    variationId
    text
    emoji
    expiresAt
    updatedAt
    isExpired
  }
}
    `;
export const DefaultVariationDocument = gql`
    query DefaultVariation($auid: ID!) {
  defaultVariation(auid: $auid) {
    auid
    variationId
  }
}
    `;
export const AddUsernameDocument = gql`
    mutation AddUsername($auid: ID!, $username: String!) {
  addUsername(auid: $auid, username: $username) {
    auid
    usernames
    defaultUsername
  }
}
    `;
export const RemoveUsernameDocument = gql`
    mutation RemoveUsername($auid: ID!, $username: String!) {
  removeUsername(auid: $auid, username: $username) {
    auid
    usernames
    defaultUsername
  }
}
    `;
export const ChangeDefaultUsernameDocument = gql`
    mutation ChangeDefaultUsername($auid: ID!, $username: String!) {
  changeDefaultUsername(auid: $auid, username: $username) {
    auid
    usernames
    defaultUsername
  }
}
    `;
export const CreateVariationDocument = gql`
    mutation CreateVariation($auid: ID!, $description: String, $locationId: String, $icon: String) {
  createVariation(
    auid: $auid
    description: $description
    locationId: $locationId
    icon: $icon
  ) {
    id
    auid
    locationId
    icon
    createdAt
  }
}
    `;
export const ChangeNameDocument = gql`
    mutation ChangeName($auid: ID!, $variationId: ID!, $elements: [NameElementInput!]!) {
  changeName(auid: $auid, variationId: $variationId, elements: $elements) {
    variationId
    elements {
      partType
      value
      separatorType
    }
    displayName
  }
}
    `;
export const ChangeDescriptionDocument = gql`
    mutation ChangeDescription($auid: ID!, $variationId: ID!, $text: String) {
  changeDescription(auid: $auid, variationId: $variationId, text: $text) {
    variationId
    text
    updatedAt
  }
}
    `;
export const ClearDescriptionDocument = gql`
    mutation ClearDescription($auid: ID!, $variationId: ID!) {
  clearDescription(auid: $auid, variationId: $variationId) {
    variationId
    text
    updatedAt
  }
}
    `;
export const ChangeStatusDocument = gql`
    mutation ChangeStatus($auid: ID!, $variationId: ID!, $text: String, $emoji: String, $expiresAt: String, $durationMinutes: Int) {
  changeStatus(
    auid: $auid
    variationId: $variationId
    text: $text
    emoji: $emoji
    expiresAt: $expiresAt
    durationMinutes: $durationMinutes
  ) {
    variationId
    text
    emoji
    expiresAt
    updatedAt
    isExpired
  }
}
    `;
export const ClearStatusDocument = gql`
    mutation ClearStatus($auid: ID!, $variationId: ID!) {
  clearStatus(auid: $auid, variationId: $variationId) {
    variationId
    text
    emoji
    expiresAt
    updatedAt
    isExpired
  }
}
    `;
export const ChangeVariationLocationIdDocument = gql`
    mutation ChangeVariationLocationId($auid: ID!, $variationId: ID!, $locationId: String) {
  changeVariationLocationId(
    auid: $auid
    variationId: $variationId
    locationId: $locationId
  ) {
    id
    locationId
  }
}
    `;
export const ChangeVariationIconDocument = gql`
    mutation ChangeVariationIcon($auid: ID!, $variationId: ID!, $icon: String) {
  changeVariationIcon(auid: $auid, variationId: $variationId, icon: $icon) {
    id
    icon
  }
}
    `;
export const SetDefaultVariationDocument = gql`
    mutation SetDefaultVariation($auid: ID!, $variationId: ID!) {
  setDefaultVariation(auid: $auid, variationId: $variationId) {
    auid
    variationId
  }
}
    `;
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
  }
}
    `;
export type Requester<C = {}> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>
export function getSdk<C>(requester: Requester<C>) {
  return {
    LoginWithPassword(variables: LoginWithPasswordMutationVariables, options?: C): Promise<LoginWithPasswordMutation> {
      return requester<LoginWithPasswordMutation, LoginWithPasswordMutationVariables>(LoginWithPasswordDocument, variables, options) as Promise<LoginWithPasswordMutation>;
    },
    WrapTokenInCredentials(variables: WrapTokenInCredentialsMutationVariables, options?: C): Promise<WrapTokenInCredentialsMutation> {
      return requester<WrapTokenInCredentialsMutation, WrapTokenInCredentialsMutationVariables>(WrapTokenInCredentialsDocument, variables, options) as Promise<WrapTokenInCredentialsMutation>;
    },
    RefreshCredentials(variables: RefreshCredentialsMutationVariables, options?: C): Promise<RefreshCredentialsMutation> {
      return requester<RefreshCredentialsMutation, RefreshCredentialsMutationVariables>(RefreshCredentialsDocument, variables, options) as Promise<RefreshCredentialsMutation>;
    },
    RevokeCredentials(variables: RevokeCredentialsMutationVariables, options?: C): Promise<RevokeCredentialsMutation> {
      return requester<RevokeCredentialsMutation, RevokeCredentialsMutationVariables>(RevokeCredentialsDocument, variables, options) as Promise<RevokeCredentialsMutation>;
    },
    CreateUser(variables: CreateUserMutationVariables, options?: C): Promise<CreateUserMutation> {
      return requester<CreateUserMutation, CreateUserMutationVariables>(CreateUserDocument, variables, options) as Promise<CreateUserMutation>;
    },
    SetPassword(variables: SetPasswordMutationVariables, options?: C): Promise<SetPasswordMutation> {
      return requester<SetPasswordMutation, SetPasswordMutationVariables>(SetPasswordDocument, variables, options) as Promise<SetPasswordMutation>;
    },
    OwnerByUsername(variables: OwnerByUsernameQueryVariables, options?: C): Promise<OwnerByUsernameQuery> {
      return requester<OwnerByUsernameQuery, OwnerByUsernameQueryVariables>(OwnerByUsernameDocument, variables, options) as Promise<OwnerByUsernameQuery>;
    },
    User(variables: UserQueryVariables, options?: C): Promise<UserQuery> {
      return requester<UserQuery, UserQueryVariables>(UserDocument, variables, options) as Promise<UserQuery>;
    },
    Usernames(variables: UsernamesQueryVariables, options?: C): Promise<UsernamesQuery> {
      return requester<UsernamesQuery, UsernamesQueryVariables>(UsernamesDocument, variables, options) as Promise<UsernamesQuery>;
    },
    Variations(variables: VariationsQueryVariables, options?: C): Promise<VariationsQuery> {
      return requester<VariationsQuery, VariationsQueryVariables>(VariationsDocument, variables, options) as Promise<VariationsQuery>;
    },
    VariationName(variables: VariationNameQueryVariables, options?: C): Promise<VariationNameQuery> {
      return requester<VariationNameQuery, VariationNameQueryVariables>(VariationNameDocument, variables, options) as Promise<VariationNameQuery>;
    },
    VariationDescription(variables: VariationDescriptionQueryVariables, options?: C): Promise<VariationDescriptionQuery> {
      return requester<VariationDescriptionQuery, VariationDescriptionQueryVariables>(VariationDescriptionDocument, variables, options) as Promise<VariationDescriptionQuery>;
    },
    VariationStatus(variables: VariationStatusQueryVariables, options?: C): Promise<VariationStatusQuery> {
      return requester<VariationStatusQuery, VariationStatusQueryVariables>(VariationStatusDocument, variables, options) as Promise<VariationStatusQuery>;
    },
    DefaultVariation(variables: DefaultVariationQueryVariables, options?: C): Promise<DefaultVariationQuery> {
      return requester<DefaultVariationQuery, DefaultVariationQueryVariables>(DefaultVariationDocument, variables, options) as Promise<DefaultVariationQuery>;
    },
    AddUsername(variables: AddUsernameMutationVariables, options?: C): Promise<AddUsernameMutation> {
      return requester<AddUsernameMutation, AddUsernameMutationVariables>(AddUsernameDocument, variables, options) as Promise<AddUsernameMutation>;
    },
    RemoveUsername(variables: RemoveUsernameMutationVariables, options?: C): Promise<RemoveUsernameMutation> {
      return requester<RemoveUsernameMutation, RemoveUsernameMutationVariables>(RemoveUsernameDocument, variables, options) as Promise<RemoveUsernameMutation>;
    },
    ChangeDefaultUsername(variables: ChangeDefaultUsernameMutationVariables, options?: C): Promise<ChangeDefaultUsernameMutation> {
      return requester<ChangeDefaultUsernameMutation, ChangeDefaultUsernameMutationVariables>(ChangeDefaultUsernameDocument, variables, options) as Promise<ChangeDefaultUsernameMutation>;
    },
    CreateVariation(variables: CreateVariationMutationVariables, options?: C): Promise<CreateVariationMutation> {
      return requester<CreateVariationMutation, CreateVariationMutationVariables>(CreateVariationDocument, variables, options) as Promise<CreateVariationMutation>;
    },
    ChangeName(variables: ChangeNameMutationVariables, options?: C): Promise<ChangeNameMutation> {
      return requester<ChangeNameMutation, ChangeNameMutationVariables>(ChangeNameDocument, variables, options) as Promise<ChangeNameMutation>;
    },
    ChangeDescription(variables: ChangeDescriptionMutationVariables, options?: C): Promise<ChangeDescriptionMutation> {
      return requester<ChangeDescriptionMutation, ChangeDescriptionMutationVariables>(ChangeDescriptionDocument, variables, options) as Promise<ChangeDescriptionMutation>;
    },
    ClearDescription(variables: ClearDescriptionMutationVariables, options?: C): Promise<ClearDescriptionMutation> {
      return requester<ClearDescriptionMutation, ClearDescriptionMutationVariables>(ClearDescriptionDocument, variables, options) as Promise<ClearDescriptionMutation>;
    },
    ChangeStatus(variables: ChangeStatusMutationVariables, options?: C): Promise<ChangeStatusMutation> {
      return requester<ChangeStatusMutation, ChangeStatusMutationVariables>(ChangeStatusDocument, variables, options) as Promise<ChangeStatusMutation>;
    },
    ClearStatus(variables: ClearStatusMutationVariables, options?: C): Promise<ClearStatusMutation> {
      return requester<ClearStatusMutation, ClearStatusMutationVariables>(ClearStatusDocument, variables, options) as Promise<ClearStatusMutation>;
    },
    ChangeVariationLocationId(variables: ChangeVariationLocationIdMutationVariables, options?: C): Promise<ChangeVariationLocationIdMutation> {
      return requester<ChangeVariationLocationIdMutation, ChangeVariationLocationIdMutationVariables>(ChangeVariationLocationIdDocument, variables, options) as Promise<ChangeVariationLocationIdMutation>;
    },
    ChangeVariationIcon(variables: ChangeVariationIconMutationVariables, options?: C): Promise<ChangeVariationIconMutation> {
      return requester<ChangeVariationIconMutation, ChangeVariationIconMutationVariables>(ChangeVariationIconDocument, variables, options) as Promise<ChangeVariationIconMutation>;
    },
    SetDefaultVariation(variables: SetDefaultVariationMutationVariables, options?: C): Promise<SetDefaultVariationMutation> {
      return requester<SetDefaultVariationMutation, SetDefaultVariationMutationVariables>(SetDefaultVariationDocument, variables, options) as Promise<SetDefaultVariationMutation>;
    },
    UserDetails(variables: UserDetailsQueryVariables, options?: C): Promise<UserDetailsQuery> {
      return requester<UserDetailsQuery, UserDetailsQueryVariables>(UserDetailsDocument, variables, options) as Promise<UserDetailsQuery>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;