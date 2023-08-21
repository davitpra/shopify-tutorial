import { json } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  IndexTable,
  Thumbnail,
  Text,
  Icon,
  HorizontalStack,
  Tooltip,
} from "@shopify/polaris";

import { getQRCodes } from "../models/QRCode.server";
import { DiamondAlertMajor, ImageMajor } from "@shopify/polaris-icons";

//LOAD QR CODES
export async function loader({ request }) {
  // gets admin permision to make fetching with graphql.
  const { admin, session } = await authenticate.admin(request);
  const QRCodes = await getQRCodes(session.shop, admin.graphql);

  return json({
    QRCodes,
  });
}

//UI IN SHOPIFY ADMIN
export default function Index() {
  const { QRCodes } = useLoaderData();
  const navigate = useNavigate();

  function truncate(str) {
    const n = 25;
    return str.length > n ? str.substr(0, n - 1) + "…" : str;
  }
  // EMPTY STATE if there are no QR Codes.
  const emptyMarkup = QRCodes.length ? null : (
    <EmptyState
      heading="Create unique QR codes for your product"
      action={{
        content: "Create QR code",
        onAction: () => navigate("qrcodes/new"),
      }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Allow customers to scan codes and buy products using their phones.</p>
    </EmptyState>
  );

  //CREATE AN INDEX TABLE:
  const qrCodesMarkup = QRCodes.length ? (
    //The table has columns for product image, QR code title, product name, the date the QR code was created, and the number of times the QR code was scanned.
    <IndexTable
      resourceName={{
        singular: "QR code",
        plural: "QR codes",
      }}
      itemCount={QRCodes.length}
      headings={[
        { title: "Thumbnail", hidden: true },
        { title: "Title" },
        { title: "Product" },
        { title: "Date created" },
        { title: "Scans" },
      ]}
      selectable={false}
    >
      {/* INDEX TABLE ROWS */}
      {QRCodes.map(
        ({
          id,
          title,
          productImage,
          productTitle,
          productDeleted,
          createdAt,
          scans,
        }) => {
          return (
            <IndexTable.Row id={id} key={id} position={id}>
              <IndexTable.Cell>
                <Thumbnail
                  source={productImage || ImageMajor}
                  alt={"product image or placeholder"}
                  size="small"
                />
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Link to={`qrcodes/${id}`}>{truncate(title)}</Link>
              </IndexTable.Cell>
              {/* WARN IF A PRODUCT IS DELETED */}
              <IndexTable.Cell>
                {productDeleted ? (
                  <HorizontalStack align="start" gap={"2"}>
                    <Tooltip content="product has been deleted">
                      <span style={{ width: "20px" }}>
                        <Icon source={DiamondAlertMajor} color="critical" />
                      </span>
                    </Tooltip>
                    <Text color={productDeleted && "critical"} as="span">
                      {truncate(productTitle)}
                    </Text>
                  </HorizontalStack>
                ) : (
                  truncate(productTitle)
                )}
              </IndexTable.Cell>
              <IndexTable.Cell>
                {new Date(createdAt).toDateString()}
              </IndexTable.Cell>
              <IndexTable.Cell>{scans}</IndexTable.Cell>
            </IndexTable.Row>
          );
        }
      )}
    </IndexTable>
  ) : null;

  //lAYOUT THE PAGE
  return (
    <Page>
      <ui-title-bar title="QR codes">
        <button variant="primary" onClick={() => navigate("/app/qrcodes/new")}>
          Create QR code
        </button>
      </ui-title-bar>
      <Layout>
        <Layout.Section>
          <Card padding={"0"}>
            {emptyMarkup}
            {qrCodesMarkup}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
