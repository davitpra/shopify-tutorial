import { json } from "@remix-run/node";
import invariant from "tiny-invariant";
import { useLoaderData } from "@remix-run/react";

import db from "../db.server";
import { getQRCodeImage } from "~/models/QRCode.server";

//LOAD THE QR CODE
export const loader = async ({ params }) => {
  // check if there is an ID in the URL
  invariant(params.id, "Could not find QR code destination");

  const id = Number(params.id);
  const qrCode = await db.qRCode.findFirst({ where: { id } });

  // check if there is a matching in the QR Code
  invariant(qrCode, "Could not find QR code destination");

  return json({
    title: qrCode.title,
    image: await getQRCodeImage(id),
  });
};

// RENDER a public QR code image.
export default function QRCode() {
  const { image, title } = useLoaderData();

  return (
    <>
      <h1>{title}</h1>
      <img src={image} alt={`QR Code for product`} />
    </>
  );
}
