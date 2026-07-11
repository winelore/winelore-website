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

export type LoginMutationVariables = Exact<{
  auid: string | number;
  password: string;
  permissions?: Array<string> | string | null | undefined;
}>;


export type LoginMutation = { login: { accessToken: string, refreshToken: string, accessTokenExpiresAt: string } };

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
  username: string;
  password: string;
}>;


export type CreateUserMutation = { createUser: { auid: string, id: string } };

export type ChangePasswordMutationVariables = Exact<{
  auid: string | number;
  tokenId?: string | null | undefined;
  newPassword: string;
}>;


export type ChangePasswordMutation = { changePassword: boolean };

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


export type VariationsQuery = { variations: Array<{ id: string, auid: string, firstName: string | null, lastName: string | null, status: string | null, description: string | null, locationId: string | null, icon: string | null, createdAt: string }> };

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
  firstName?: string | null | undefined;
  lastName?: string | null | undefined;
  status?: string | null | undefined;
  description?: string | null | undefined;
  locationId?: string | null | undefined;
  icon?: string | null | undefined;
}>;


export type CreateVariationMutation = { createVariation: { id: string, auid: string, firstName: string | null, lastName: string | null, status: string | null, description: string | null, locationId: string | null, icon: string | null, createdAt: string } };

export type ChangeVariationFirstNameMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  firstName?: string | null | undefined;
}>;


export type ChangeVariationFirstNameMutation = { changeVariationFirstName: { id: string, firstName: string | null } };

export type ChangeVariationLastNameMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  lastName?: string | null | undefined;
}>;


export type ChangeVariationLastNameMutation = { changeVariationLastName: { id: string, lastName: string | null } };

export type ChangeVariationStatusMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  status?: string | null | undefined;
}>;


export type ChangeVariationStatusMutation = { changeVariationStatus: { id: string, status: string | null } };

export type ChangeVariationDescriptionMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  description?: string | null | undefined;
}>;


export type ChangeVariationDescriptionMutation = { changeVariationDescription: { id: string, description: string | null } };

export type SetDefaultVariationMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
}>;


export type SetDefaultVariationMutation = { setDefaultVariation: { auid: string, variationId: string } };

export type UserDetailsQueryVariables = Exact<{
  auid: string | number;
}>;


export type UserDetailsQuery = { usernames: { defaultUsername: string } | null, defaultVariation: { variationId: string } | null, variations: Array<{ id: string, firstName: string | null, lastName: string | null }> };


export const LoginDocument = gql`
    mutation Login($auid: ID!, $password: String!, $permissions: [String!]) {
  login(auid: $auid, password: $password, permissions: $permissions) {
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
    mutation CreateUser($contextAuid: ID, $tokenId: String, $username: String!, $password: String!) {
  createUser(
    contextAuid: $contextAuid
    tokenId: $tokenId
    username: $username
    password: $password
  ) {
    auid
    id
  }
}
    `;
export const ChangePasswordDocument = gql`
    mutation ChangePassword($auid: ID!, $tokenId: String, $newPassword: String!) {
  changePassword(auid: $auid, tokenId: $tokenId, newPassword: $newPassword)
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
    firstName
    lastName
    status
    description
    locationId
    icon
    createdAt
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
    mutation CreateVariation($auid: ID!, $firstName: String, $lastName: String, $status: String, $description: String, $locationId: String, $icon: String) {
  createVariation(
    auid: $auid
    firstName: $firstName
    lastName: $lastName
    status: $status
    description: $description
    locationId: $locationId
    icon: $icon
  ) {
    id
    auid
    firstName
    lastName
    status
    description
    locationId
    icon
    createdAt
  }
}
    `;
export const ChangeVariationFirstNameDocument = gql`
    mutation ChangeVariationFirstName($auid: ID!, $variationId: ID!, $firstName: String) {
  changeVariationFirstName(
    auid: $auid
    variationId: $variationId
    firstName: $firstName
  ) {
    id
    firstName
  }
}
    `;
export const ChangeVariationLastNameDocument = gql`
    mutation ChangeVariationLastName($auid: ID!, $variationId: ID!, $lastName: String) {
  changeVariationLastName(
    auid: $auid
    variationId: $variationId
    lastName: $lastName
  ) {
    id
    lastName
  }
}
    `;
export const ChangeVariationStatusDocument = gql`
    mutation ChangeVariationStatus($auid: ID!, $variationId: ID!, $status: String) {
  changeVariationStatus(auid: $auid, variationId: $variationId, status: $status) {
    id
    status
  }
}
    `;
export const ChangeVariationDescriptionDocument = gql`
    mutation ChangeVariationDescription($auid: ID!, $variationId: ID!, $description: String) {
  changeVariationDescription(
    auid: $auid
    variationId: $variationId
    description: $description
  ) {
    id
    description
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
    firstName
    lastName
  }
}
    `;
export type Requester<C = {}> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>
export function getSdk<C>(requester: Requester<C>) {
  return {
    Login(variables: LoginMutationVariables, options?: C): Promise<LoginMutation> {
      return requester<LoginMutation, LoginMutationVariables>(LoginDocument, variables, options) as Promise<LoginMutation>;
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
    ChangePassword(variables: ChangePasswordMutationVariables, options?: C): Promise<ChangePasswordMutation> {
      return requester<ChangePasswordMutation, ChangePasswordMutationVariables>(ChangePasswordDocument, variables, options) as Promise<ChangePasswordMutation>;
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
    ChangeVariationFirstName(variables: ChangeVariationFirstNameMutationVariables, options?: C): Promise<ChangeVariationFirstNameMutation> {
      return requester<ChangeVariationFirstNameMutation, ChangeVariationFirstNameMutationVariables>(ChangeVariationFirstNameDocument, variables, options) as Promise<ChangeVariationFirstNameMutation>;
    },
    ChangeVariationLastName(variables: ChangeVariationLastNameMutationVariables, options?: C): Promise<ChangeVariationLastNameMutation> {
      return requester<ChangeVariationLastNameMutation, ChangeVariationLastNameMutationVariables>(ChangeVariationLastNameDocument, variables, options) as Promise<ChangeVariationLastNameMutation>;
    },
    ChangeVariationStatus(variables: ChangeVariationStatusMutationVariables, options?: C): Promise<ChangeVariationStatusMutation> {
      return requester<ChangeVariationStatusMutation, ChangeVariationStatusMutationVariables>(ChangeVariationStatusDocument, variables, options) as Promise<ChangeVariationStatusMutation>;
    },
    ChangeVariationDescription(variables: ChangeVariationDescriptionMutationVariables, options?: C): Promise<ChangeVariationDescriptionMutation> {
      return requester<ChangeVariationDescriptionMutation, ChangeVariationDescriptionMutationVariables>(ChangeVariationDescriptionDocument, variables, options) as Promise<ChangeVariationDescriptionMutation>;
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