import { gql } from "@/src/gql"

// Every mutation below returns the full Beverage so the client can refresh
// its local state directly from the mutation response instead of refetching.

export const SUBMIT_BEVERAGE_FOR_REVIEW = gql(`
  mutation SubmitBeverageForReview($id: ID!) {
    submitBeverageForReview(id: $id) {
      id
      name
      status
      typeId
      attributes
      producers {
        id
        auid
        producerId
        role
      }
      origin {
        latitude
        longitude
      }
    }
  }
`)

export const CHANGE_BEVERAGE_NAME = gql(`
  mutation ChangeBeverageName($id: ID!, $newName: String!) {
    changeBeverageName(id: $id, newName: $newName) {
      id
      name
      status
      typeId
      attributes
      producers {
        id
        auid
        producerId
        role
      }
      origin {
        latitude
        longitude
      }
    }
  }
`)

export const CHANGE_BEVERAGE_ORIGIN = gql(`
  mutation ChangeBeverageOrigin($id: ID!, $origin: CoordinatesInput) {
    changeBeverageOrigin(id: $id, origin: $origin) {
      id
      name
      status
      typeId
      attributes
      producers {
        id
        auid
        producerId
        role
      }
      origin {
        latitude
        longitude
      }
    }
  }
`)

export const UPDATE_BEVERAGE_ATTRIBUTES = gql(`
  mutation UpdateBeverageAttributes($id: ID!, $attributes: JSON!) {
    updateBeverageAttributes(id: $id, attributes: $attributes) {
      id
      name
      status
      typeId
      attributes
      producers {
        id
        auid
        producerId
        role
      }
      origin {
        latitude
        longitude
      }
    }
  }
`)

export const REGISTER_BEVERAGE_PRODUCER = gql(`
  mutation RegisterBeverageProducer($id: ID!, $producer: ProducerInput!) {
    registerBeverageProducer(id: $id, producer: $producer) {
      id
      name
      status
      typeId
      attributes
      producers {
        id
        auid
        producerId
        role
      }
      origin {
        latitude
        longitude
      }
    }
  }
`)

export const UNREGISTER_BEVERAGE_PRODUCER = gql(`
  mutation UnregisterBeverageProducer($id: ID!, $producerDetailsId: ID!) {
    unregisterBeverageProducer(id: $id, producerDetailsId: $producerDetailsId) {
      id
      name
      status
      typeId
      attributes
      producers {
        id
        auid
        producerId
        role
      }
      origin {
        latitude
        longitude
      }
    }
  }
`)

export const CREATE_BEVERAGE = gql(`
  mutation CreateBeverage($input: CreateBeverageInput!) {
    createBeverage(input: $input) {
      id
      name
      status
      typeId
      attributes
      producers {
        id
        auid
        producerId
        role
      }
      origin {
        latitude
        longitude
      }
    }
  }
`)

export const CREATE_BEVERAGE_TYPE = gql(`
  mutation CreateBeverageType($input: CreateBeverageTypeInput!) {
    createBeverageType(input: $input) {
      id
    }
  }
`)

export const PUBLISH_BEVERAGE_TYPE = gql(`
  mutation PublishBeverageType($id: ID!) {
    publishBeverageType(id: $id) {
      id
    }
  }
`)

