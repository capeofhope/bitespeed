# Bitespeed Identity Reconciliation Endpoint

A Next.js web service designed to identify and keep track of a customer's identity across multiple purchases by consistently linking their contact information (email and phone number).

## Project Structure

```
bitespeed/
├── app/
│   ├── api/
│   │   └── identify/
│   │       └── route.ts       # Core API endpoint logic containing reconciliation algorithms
│   └── lib/
│       └── prisma.ts          # Prisma client instantiation
├── prisma/
│   └── schema.prisma          # Database schema defining the Contact model
├── testcases.ts               # Local testing script to verify all algorithm edge cases
├── .env                       # Environment variables (Database URL)
└── package.json               # Project dependencies (Next.js, Prisma, TypeScript)
```

## Building Stages

This project was built incrementally across the following stages:

1. **Initialization**: Bootstrapped the application using Next.js (App Router) with TypeScript support.
2. **Database Setup**: Integrated Prisma ORM and connected it to a PostgreSQL database (Neon DB).
3. **Schema Design**: Defined the relational `Contact` model supporting self-relation for contact clustering (storing `linkedId` and `linkPrecedence`).
4. **Endpoint Implementation**: Developed the logic within `/api/identify` to query matches, identify clusters, elect the oldest primary contact, and execute necessary secondary demotions and cluster updates.
5. **Testing & QA**: Created `testcases.ts` to simulate local API hits against the database directly and to assure no edge cases (like primary-to-primary merging) fail the requirements.
6. **Polishing**: Assured exact contract matching, including the specific spelling of `primaryContatctId`.

---

## API Specification

**POST** `/api/identify`

### Request Format
The endpoint accepts JSON bodies containing an email, a phone number, or both.

```json
{
  "email"?: "string",
  "phoneNumber"?: "string"
}
```

### Response Format
Returns an HTTP 200 response with the consolidated contact data.

```json
{
  "contact": {
    "primaryContatctId": number,
    "emails": ["string"], // Array of unique emails, primary is first
    "phoneNumbers": ["string"], // Array of unique phone numbers, primary is first
    "secondaryContactIds": [number] // Array of all linked secondary Contact IDs
  }
}
```
*(Note: The key `primaryContatctId` is spelled exactly as per the project requirements.)*

---

## Behavioral Examples

### 1. New Customer (No Existing Data)
If the DB has no prior records for the provided specs, it treats it as a new customer and creates a `primary` contact.

**Request:**
```json
{
  "email": "lorraine@hillvalley.edu",
  "phoneNumber": "123456"
}
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

### 2. Secondary Linking (Partial Match)
If the request matches an existing customer on one parameter but has a new second parameter, the service links the new info as `secondary`.

**Request:**
```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

### 3. Merging Primary Contacts
If a new request acts as a bridge between two existing independent contacts, the newest primary contact is demoted to `secondary` and linked to the oldest primary contact.

*Assume `george@hillvalley.edu` (id 11) and `biffsucks@hillvalley.edu` (id 27) are independent primary contacts.*

**Request:**
```json
{
  "email": "george@hillvalley.edu",
  "phoneNumber": "717171"
}
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 11,
    "emails": ["george@hillvalley.edu", "biffsucks@hillvalley.edu"],
    "phoneNumbers": ["919191", "717171"],
    "secondaryContactIds": [27]
  }
}
```
