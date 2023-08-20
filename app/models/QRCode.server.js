import qrcode from "qrcode";
import db from "../db.server";

// get a single QR code for your QR
export async function getQRCode(id, graphql) {
  const qrCode = await db.qRCode.findFirst({ where: { id } });

  if (!qrCode) {
    return null;
  }

  return supplementQRCode(qrCode, graphql);
}

// gets all QR codes
export async function getQRCodes(shop, graphql) {
  const qrCodes = await db.qRCode.findMany({
    where: { shop },
    orderBy: { id: "desc" },
  });

  if (!qrCodes.length) {
    return qrCodes;
  }

  return Promise.all(
    qrCodes.map(async (qrCode) => supplementQRCode(qrCode, graphql))
  );
}

//get QR code image
export async function getQRCodeImage(id) {
  const url = new URL(`/qrcodes/${id}/scan`, process.env.SHOPIFY_APP_URL);
  const image = await qrcode.toBuffer(url.href);

  return `data:image/jpeg;base64, ${image.toString("base64")}`;
}

// return url destination
export function getDestinationUrl(quCode) {
  //destination to product details page
  if (quCode.destination === "product") {
    return `https://${quCode.shop}/products/${quCode.productHandle}`;
  }


  const id = quCode.productVariantId.replace(
    /gid:\/\/shopify\/ProductVariant\/([0-9]+)/,
    "$1"
  );
  //destination to cart page
  return `https://${quCode.shop}/cart/${id}:1`;
}

//gets additional product and variant data
async function supplementQRCode(qrCode, graphql) {
  const response = await graphql(
    `
      query supplementQRCode($id: ID!) {
        product(id: $id) {
          title
          images(first: 1) {
            nodes {
              altText
              url
            }
          }
        }
      }
    `,
    {
      variables: {
        id: qrCode.productId,
      },
    }
  );

  const {
    data: { product },
  } = await response.json();

  //gets product info and qrCode.
  return {
    ...qrCode,
    productDeleted: !product.title,
    productTitle: product.title,
    productImage: product.images?.nodes[0]?.url,
    productAlt: product.images?.nodes[0]?.altText,
    destinationUrl: getDestinationUrl(qrCode),
    image: await getQRCodeImage(qrCode.id),
  };
}

// fuction to validate data info.
export function validateQRCode(data) {
  const errors = {};

  if (!data.title) {
    errors.title = "Title is required";
  }

  if (!data.productId) {
    errors.productId = "Product is required";
  }

  if (!data.destination) {
    errors.destination = "Destination is required";
  }

  if (Object.keys(errors).length) {
    return errors;
  }
}
