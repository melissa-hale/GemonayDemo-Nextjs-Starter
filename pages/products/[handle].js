import { useState } from 'react';
import Image from 'next/image';
import { useCart } from '@nacelle/react-hooks';
import { nacelleClient } from 'services';
import { getSelectedVariant } from 'utils/getSelectedVariant';
import { getCartVariant } from 'utils/getCartVariant';
import styles from 'styles/Product.module.css';
import Countdown, { zeroPad } from 'react-countdown';

function Product({ product, flashSale, outletSaleText, additionalSaleText }) {
  const [, { addToCart }] = useCart();
  const [selectedVariant, setSelectedVariant] = useState(product.variants ? product.variants[0] : false);
  const [selectedOptions, setSelectedOptions] = useState(selectedVariant && selectedVariant.content
    ? selectedVariant.content.selectedOptions
    : false
  );
  const [quantity, setQuantity] = useState(1);

  if (!product.variants) return <div>Product Error</div>;

  let options = null;
  if (product?.content?.options?.some((option) => option.values.length > 1)) {
    options = product?.content?.options;
  }

  const buttonText = selectedVariant
    ? selectedVariant.availableForSale
      ? 'Add To Cart'
      : 'Sold Out'
    : 'Select Option';

  // Construct the flash sale countdown timer. If the date has not already passed.
  let flashSaleText = false
  const flashSaleRenderer = ({days, hours, minutes, seconds, completed }) => {
    if(completed) {
      return <></>
    } else {
      const daysText = days > 1 ? <strong>{days} Days</strong> : <strong>Today</strong>;
      return <p suppressHydrationWarning>Ends {daysText} {zeroPad(hours)}:{zeroPad(minutes)}:{zeroPad(seconds)}</p>
    }
  }
  if (flashSale?.fields?.endDate) {
    const now = new Date();
    const endDate = new Date(flashSale.fields.endDate);
    if (now < endDate) {
      flashSaleText = (
        <Countdown
          date={endDate}
          daysInHours={true}
          renderer={flashSaleRenderer}
        />
      )
    }
  }

  // Will show Outlet Sale messaging if product has a metafield
  // with a key of "outlet" and a value of "true"
  const isOutletSale = product.metafields
    ? product.metafields.some(field => field.key === "outlet" && field.value === "true")
    : false

  // Will show the Additional Sale messaging if product has a
  // metafield with a key of "additional_sale" and a value of "true"
  const isAdditionalSale = product.metafields
    ? product.metafields.some(field => field.key === "additional_sale" && field.value === "true")
    : false

  const handleOptionChange = (event, option) => {
    const newOption = { name: option.name, value: event.target.value };
    const optionIndex = selectedOptions.findIndex((selectedOption) => {
      return selectedOption.name === newOption.name;
    });

    const newSelectedOptions = [...selectedOptions];
    if (optionIndex > -1) {
      newSelectedOptions.splice(optionIndex, 1, newOption);
      setSelectedOptions([...newSelectedOptions]);
    } else {
      setSelectedOptions([...newSelectedOptions, newOption]);
    }
    const variant = getSelectedVariant({
      product,
      options: newSelectedOptions
    });
    setSelectedVariant(variant ? { ...variant } : null);
  };

  const handleQuantityChange = (event) => {
    setQuantity(+event.target.value);
  };

  // Get product data and add it to the cart by using `addToCart`
  // from the `useCart` hook provided by `@nacelle/react-hooks`.
  // (https://github.com/getnacelle/nacelle-react/tree/main/packages/react-hooks)
  const handleAddItem = () => {
    const variant = getCartVariant({
      product,
      variant: selectedVariant
    });
    addToCart({
      variant,
      quantity
    });
  };

  return (
    product && (
      <div className={styles.product}>
        <div className={styles.media}>
          <Image
            src={product.content.featuredMedia.src}
            alt={product.content.featuredMedia.altText}
            width={530}
            height={350}
            className={styles.image}
          />
        </div>
        <div className={styles.main}>
          {product.content.title && <h1>{product.content.title}</h1>}
          {isOutletSale && outletSaleText && (<div><strong>{ outletSaleText }</strong></div>)}
          {isAdditionalSale && additionalSaleText && (<div><strong>{ additionalSaleText }</strong></div>)}
          <div className={styles.prices}>
            {selectedVariant.compareAtPrice && (
              <div className={styles.compare}>
                ${selectedVariant.compareAtPrice}
              </div>
            )}
            <div>${selectedVariant.price}</div>
          </div>
          {options &&
            options.map((option, oIndex) => (
              <div key={oIndex}>
                <label htmlFor={`select-${oIndex}-${product.id}`}>
                  {option.name}
                </label>
                <select
                  id={`select-${oIndex}-${product.id}`}
                  onChange={($event) => handleOptionChange($event, option)}
                >
                  {option.values.map((value, vIndex) => (
                    <option key={vIndex} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          {product.content.description && (
            <div
              dangerouslySetInnerHTML={{ __html: product.content.description }}
            />
          )}
          <div>
            <label htmlFor={`quantity-${product.nacelleEntryId}`}>
              Quantity:
            </label>
            <input
              id={`quantity-${product.nacelleEntryId}`}
              type="number"
              min="1"
              value={quantity}
              onChange={handleQuantityChange}
            />
          </div>
          <button type="button" onClick={handleAddItem}>
            {buttonText}
          </button>
          {flashSaleText && (flashSaleText)}
        </div>
      </div>
    )
  );
}

export default Product;

export async function getStaticPaths() {
  // Performs a GraphQL query to Nacelle to get product handles.
  // (https://nacelle.com/docs/querying-data/storefront-sdk)
  const results = await nacelleClient.query({
    query: HANDLES_QUERY
  });
  const handles = results.products
    .filter((product) => product.content?.handle)
    .map((product) => ({ params: { handle: product.content.handle } }));

  return {
    paths: handles,
    fallback: 'blocking'
  };
}

export async function getStaticProps({ params }) {
  // Performs a GraphQL query to Nacelle to get product data,
  // using the handle of the current page.
  // (https://nacelle.com/docs/querying-data/storefront-sdk)
  const {
    products,
    productCollections,
    flashSales,
    outletMessaging,
    additionalSaleMessaging
  } = await nacelleClient.query({
    query: PAGE_QUERY,
    variables: { handle: params.handle }
  });

  const product = products[0];
  // Get collections that have the product assigned to.
  const collectionsWithProduct = productCollections.filter((collection) => {
    return collection.products.some((colProduct) => {
      return product.content.handle === colProduct.content.handle
    })
  })
  // Find the flash sale content that matches the product's collection.
  const flashSale = flashSales.find(flashSale => {
    return collectionsWithProduct.some((collection) => {
      return flashSale.fields.collectionHandle === collection.content.handle
    })
  }) || false;
  // Get the sales messaging text.
  const outletSaleText = outletMessaging ? outletMessaging[0]?.fields?.text : false
  const additionalSaleText = additionalSaleMessaging ? additionalSaleMessaging[0]?.fields?.text : false

  if (!products.length) {
    return {
      notFound: true
    };
  }

  return {
    props: {
      product,
      flashSale,
      outletSaleText,
      additionalSaleText
    },
    revalidate: 60
  };
}

// GraphQL query for the handles of products. Used in `getStaticPaths`.
// (https://nacelle.com/docs/querying-data/storefront-api)
const HANDLES_QUERY = `
  {
    products {
      content {
        handle
      }
    }
  }
`;

// GraphQL query for product content. Used in `getStaticProps`.
// (https://nacelle.com/docs/querying-data/storefront-api)
const PAGE_QUERY = `
  query ProductPage($handle: String!){
    products(filter: { handles: [$handle] }){
      nacelleEntryId
      sourceEntryId
      content{
        handle
        title
        description
        options{
          name
          values
        }
        featuredMedia{
          src
          thumbnailSrc
          altText
        }
			}
      metafields{
        key
        value
      }
      variants{
        nacelleEntryId
        sourceEntryId
        sku
        availableForSale
        price
        compareAtPrice
        content{
          title
          selectedOptions{
            name
            value
          }
          featuredMedia{
            src
            thumbnailSrc
            altText
          }
        }
      }
    }

    productCollections {
      content {
        handle
      }
      products {
        content {
          handle
        }
      }
    }

    flashSales: content(filter: { type: "flashSale" }) {
      fields
    }

    outletMessaging: content(filter: { handles: ["outlet-sale"], type: "promotionalMessaging" }){
      fields
    }

    additionalSaleMessaging: content(filter: { handles: ["additional-sale"], type: "promotionalMessaging" }){
      fields
    }
  }
`;
