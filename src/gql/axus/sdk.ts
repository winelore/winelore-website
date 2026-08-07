/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
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


export type RefreshCredentialsMutation = { refreshCredentials: { auid: string, accessToken: string, refreshToken: string, accessTokenExpiresAt: string } };

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

export type DefaultVariationQueryVariables = Exact<{
  auid: string | number;
}>;


export type DefaultVariationQuery = { defaultVariation: { auid: string, variationId: string } | null };

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
  tokenId?: string | null | undefined;
  description?: string | null | undefined;
  locationId?: string | null | undefined;
  icon?: string | null | undefined;
}>;


export type CreateVariationMutation = { createVariation: { id: string, auid: string, locationId: string | null, icon: string | null, createdAt: string } };

export type ChangeNameMutationVariables = Exact<{
  auid: string | number;
  tokenId?: string | null | undefined;
  variationId: string | number;
  elements: Array<NameElementInput> | NameElementInput;
}>;


export type ChangeNameMutation = { changeName: { variationId: string, displayName: string, elements: Array<{ partType: NamePartType | null, value: string | null, separatorType: NameSeparatorType | null }> } };

export type ChangeDescriptionMutationVariables = Exact<{
  auid: string | number;
  tokenId?: string | null | undefined;
  variationId: string | number;
  text?: string | null | undefined;
}>;


export type ChangeDescriptionMutation = { changeDescription: { variationId: string, text: string | null, updatedAt: string } };

export type ChangeStatusMutationVariables = Exact<{
  auid: string | number;
  tokenId?: string | null | undefined;
  variationId: string | number;
  text?: string | null | undefined;
  emoji?: string | null | undefined;
  expiresAt?: string | null | undefined;
  durationMinutes?: number | null | undefined;
}>;


export type ChangeStatusMutation = { changeStatus: { variationId: string, text: string | null, emoji: string | null, expiresAt: string | null, updatedAt: string, isExpired: boolean } };

export type ChangeVariationLocationIdMutationVariables = Exact<{
  auid: string | number;
  tokenId?: string | null | undefined;
  variationId: string | number;
  locationId?: string | null | undefined;
}>;


export type ChangeVariationLocationIdMutation = { changeVariationLocationId: { id: string, locationId: string | null } };

export type ChangeVariationIconMutationVariables = Exact<{
  auid: string | number;
  tokenId?: string | null | undefined;
  variationId: string | number;
  icon?: string | null | undefined;
}>;


export type ChangeVariationIconMutation = { changeVariationIcon: { id: string, icon: string | null } };

export type SetDefaultVariationMutationVariables = Exact<{
  auid: string | number;
  tokenId?: string | null | undefined;
  variationId: string | number;
}>;


export type SetDefaultVariationMutation = { setDefaultVariation: { auid: string, variationId: string } };

export type UserDetailsQueryVariables = Exact<{
  auid: string | number;
}>;


export type UserDetailsQuery = { usernames: { defaultUsername: string } | null, defaultVariation: { variationId: string } | null, variations: Array<{ id: string, locationId: string | null, icon: string | null }> };


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
    auid
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
export const VariationNameDocument = gql`
    query VariationName($variationId: ID!) {
  name(variationId: $variationId) {
    variationId
    displayName
    elements {
      partType
      value
      separatorType
    }
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
    mutation CreateVariation($auid: ID!, $tokenId: String, $description: String, $locationId: String, $icon: String) {
  createVariation(
    auid: $auid
    tokenId: $tokenId
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
    mutation ChangeName($auid: ID!, $tokenId: String, $variationId: ID!, $elements: [NameElementInput!]!) {
  changeName(
    auid: $auid
    tokenId: $tokenId
    variationId: $variationId
    elements: $elements
  ) {
    variationId
    displayName
    elements {
      partType
      value
      separatorType
    }
  }
}
    `;
export const ChangeDescriptionDocument = gql`
    mutation ChangeDescription($auid: ID!, $tokenId: String, $variationId: ID!, $text: String) {
  changeDescription(
    auid: $auid
    tokenId: $tokenId
    variationId: $variationId
    text: $text
  ) {
    variationId
    text
    updatedAt
  }
}
    `;
export const ChangeStatusDocument = gql`
    mutation ChangeStatus($auid: ID!, $tokenId: String, $variationId: ID!, $text: String, $emoji: String, $expiresAt: String, $durationMinutes: Int) {
  changeStatus(
    auid: $auid
    tokenId: $tokenId
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
export const ChangeVariationLocationIdDocument = gql`
    mutation ChangeVariationLocationId($auid: ID!, $tokenId: String, $variationId: ID!, $locationId: String) {
  changeVariationLocationId(
    auid: $auid
    tokenId: $tokenId
    variationId: $variationId
    locationId: $locationId
  ) {
    id
    locationId
  }
}
    `;
export const ChangeVariationIconDocument = gql`
    mutation ChangeVariationIcon($auid: ID!, $tokenId: String, $variationId: ID!, $icon: String) {
  changeVariationIcon(
    auid: $auid
    tokenId: $tokenId
    variationId: $variationId
    icon: $icon
  ) {
    id
    icon
  }
}
    `;
export const SetDefaultVariationDocument = gql`
    mutation SetDefaultVariation($auid: ID!, $tokenId: String, $variationId: ID!) {
  setDefaultVariation(auid: $auid, tokenId: $tokenId, variationId: $variationId) {
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
    locationId
    icon
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
    VariationName(variables: VariationNameQueryVariables, options?: C): Promise<VariationNameQuery> {
      return requester<VariationNameQuery, VariationNameQueryVariables>(VariationNameDocument, variables, options) as Promise<VariationNameQuery>;
    },
    VariationDescription(variables: VariationDescriptionQueryVariables, options?: C): Promise<VariationDescriptionQuery> {
      return requester<VariationDescriptionQuery, VariationDescriptionQueryVariables>(VariationDescriptionDocument, variables, options) as Promise<VariationDescriptionQuery>;
    },
    VariationStatus(variables: VariationStatusQueryVariables, options?: C): Promise<VariationStatusQuery> {
      return requester<VariationStatusQuery, VariationStatusQueryVariables>(VariationStatusDocument, variables, options) as Promise<VariationStatusQuery>;
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
    ChangeStatus(variables: ChangeStatusMutationVariables, options?: C): Promise<ChangeStatusMutation> {
      return requester<ChangeStatusMutation, ChangeStatusMutationVariables>(ChangeStatusDocument, variables, options) as Promise<ChangeStatusMutation>;
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