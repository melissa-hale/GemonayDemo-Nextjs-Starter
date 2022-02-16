import Storefront from '@nacelle/storefront-sdk';

// Initializes a Storefront client from `@nacelle/storefront-sdk`
// using credentials provided from the Nacelle Dashboard.
// (https://nacelle.com/docs/querying-data/storefront-sdk)

export default new Storefront({
  storefrontEndpoint: process.env.NEXT_PUBLIC_NACELLE_STOREFRONT_ENDPOINT,
  token: process.env.NEXT_PUBLIC_NACELLE_STOREFRONT_TOKEN
});

// import NacelleClient from "@nacelle/client-js-sdk";

// export default new NacelleClient({
//   id: process.env.NEXT_PUBLIC_NACELLE_SPACE_ID,
//   token: process.env.NEXT_PUBLIC_NACELLE_GRAPHQL_TOKEN,
//   nacelleEndpoint: process.env.NEXT_PUBLIC_NACELLE_ENDPOINT,
//   useStatic: false
// });
