// This is for creating a new QR code and editing an existing one.

import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  useNavigate,
} from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  Bleed,
  Button,
  ChoiceList,
  Divider,
  EmptyState,
  HorizontalStack,
  InlineError,
  Layout,
  Page,
  Text,
  TextField,
  Thumbnail,
  VerticalStack,
  PageActions,
} from "@shopify/polaris";
import { ImageMajor } from "@shopify/polaris-icons";

import db from "../db.server";
import { getQRCode, validateQRCode } from "../models/QRCode.server";

export async function loader({ request, params }) {
  //to gets admin permision to fetch data from graphQL.
  const { admin } = await authenticate.admin(request);

  //if id is the route new then return.
  if (params.id === "new") {
    return json({
      destination: "product",
      title: "",
    });
  }
  // gets the QR code of the product id.
  return json(await getQRCode(Number(params.id), admin.graphql));
}

export async function action({ request, params }) {
  //gets the session to gets the store.
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  // delete with prisma the product id.
  if (request.method === "DELETE") {
    await db.qRCode.delete({ where: { id: Number(params.id) } });
    return redirect("/app");
  }

  // gets all form data in one object.
  /** @type {any} */
  const data = {
    ...Object.fromEntries(await request.formData()),
    shop,
  };

  // validate if all fiels where filled.
  const errors = validateQRCode(data);

  //return errors
  if (errors) {
    return json({ errors }, { status: 422 });
  }

  // if the product id match with new create on the db, otherwise update.
  const qrCode =
    params.id === "new"
      ? await db.qRCode.create({ data })
      : await db.qRCode.update({ where: { id: Number(params.id) }, data });

  //redirect  to qrcodes id.
  return redirect(`/app/qrcodes/${qrCode.id}`);
}

// UI TO UPDATE THE QR.
export default function QRCodeForm() {

  //gets error if it is.
  const errors = useActionData()?.errors || {};

  // gets the qrCode.
  const qrCode = useLoaderData();
  // When the user changes the title, selects a product, or changes the destination, this state is updated.
  const [formState, setFormState] = useState(qrCode);
  // The initial state of the form. This only changes when the user submits the form.
  const [cleanFormState, setCleanFormState] = useState(qrCode);
  // Determines if the form has changed. This is used to enable save buttons when the app user has changed the form contents
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);

  // To know the states and methods of navigations
  const nav = useNavigation();
  //to disable buttons and show loading states.
  const isSaving = nav.state === "submitting" && nav.formMethod === "POST";
  const isDeleting = nav.state === "submitting" && nav.formMethod === "DELETE";

  // to navigate into routes.
  const navigate = useNavigate();

  async function selectProduct() {
    //Add a modal that allows the user to select a product.
    const products = await window.shopify.resourcePicker({
      type: "product",
      action: "select", // customized action verb, either 'select' or 'add',
    });

    // save the selection to form state.
    if (products) {
      const { images, id, variants, title, handle } = products[0];

      setFormState({
        ...formState,
        productId: id,
        productVariantId: variants[0].id,
        productTitle: title,
        productHandle: handle,
        productAlt: images[0]?.altText,
        productImage: images[0]?.originalSrc,
      });
    }
  }

  // to save the form data.
  const submit = useSubmit();
  // action to save data from formState.
  function handleSave() {
    const data = {
      title: formState.title,
      productId: formState.productId || "",
      productVariantId: formState.productVariantId || "",
      productHandle: formState.productHandle || "",
      destination: formState.destination,
    };
    // to handle loading
    setCleanFormState({ ...formState });
    submit(data, { method: "post" });
  }

  return (
    <Page>
      {/* display a title that indicates to the user whether they're creating or editing a QR code */}
      <ui-title-bar title={qrCode.id ? "Edit QR code" : "Create new QR code"}>
        <button onClick={() => navigate("/app")}>
          QR codes
        </button>
      </ui-title-bar>
      <Layout>
        <Layout.Section>
          <VerticalStack gap="5">
            <Card>
              <VerticalStack gap="5">
                <Text as={"h2"} variant="headingLg">
                  Title
                </Text>
                <TextField
                  id="title"
                  helpText="Only store staff can see this title"
                  label="title"
                  labelHidden
                  autoComplete="off"
                  value={formState.title}
                  onChange={(title) =>
                    setFormState({ ...formState, title: title })
                  }
                  error={errors.title}
                />
              </VerticalStack>
            </Card>
            <Card>
              <VerticalStack gap="5">
                <HorizontalStack align="space-between">
                  <Text as={"h2"} variant="headingLg">
                    Product
                  </Text>
                  {/* If the user hasn't selected a product, then display a */}
                  {formState.productId ? (
                    <Button plain onClick={selectProduct}>
                      Change product
                    </Button>
                  ) : null}
                </HorizontalStack>
                {/* If the user has selected a product, use Thumbnail to display the product image. */}
                {formState.productId ? (
                  <HorizontalStack blockAlign="center" gap={"5"}>
                    <Thumbnail
                      source={formState.productImage || ImageMajor}
                      alt={formState.productAlt}
                    />
                    <Text as="span" variant="headingMd" fontWeight="semibold">
                      {formState.productTitle}
                    </Text>
                  </HorizontalStack>
                ) : (
                  <VerticalStack gap="2">
                    <Button onClick={selectProduct} id="select-product">
                      Select product
                    </Button>
                    {/* se inlineError to display an error from useActionData if the user submits the form without selecting a product. */}
                    {errors.productId ? (
                      <InlineError
                        message={errors.productId}
                        fieldID="myFieldID"
                      />
                    ) : null}
                  </VerticalStack>
                )}
                <Bleed marginInline="20">
                  <Divider />
                </Bleed>
                {/* Add destination options */}
                <HorizontalStack
                  gap="5"
                  align="space-between"
                  blockAlign="start"
                >
                  <ChoiceList
                    title="Scan destination"
                    choices={[
                      { label: "Link to product page", value: "product" },
                      {
                        label: "Link to checkout page with product in the cart",
                        value: "cart",
                      },
                    ]}
                    selected={[formState.destination]}
                    onChange={(destination) =>
                      setFormState({
                        ...formState,
                        destination: destination[0],
                      })
                    }
                    error={errors.destination}
                  />
                  {qrCode.destinationUrl ? (
                    <Button plain url={qrCode.destinationUrl} external>
                      Go to destination URL
                    </Button>
                  ) : null}
                </HorizontalStack>
              </VerticalStack>
            </Card>
          </VerticalStack>
        </Layout.Section>
        {/* Display a preview of the QR code */}
        <Layout.Section secondary>
          <Card>
            <Text as={"h2"} variant="headingLg">
              QR code
            </Text>
            {qrCode ? (
              <EmptyState image={qrCode.image} imageContained={true} />
            ) : (
              <EmptyState image="">
                Your QR code will appear here after you save
              </EmptyState>
            )}
            <VerticalStack gap="3">
              <Button
                disabled={!qrCode?.image}
                url={qrCode?.image}
                download
                primary
              >
                Download
              </Button>
              <Button
                disabled={!qrCode.id}
                url={`/qrcodes/${qrCode.id}`}
                external
              >
                Go to public URL
              </Button>
            </VerticalStack>
          </Card>
        </Layout.Section>
        {/* Add save and delete buttons */}
        <Layout.Section>
          <PageActions
            secondaryActions={[
              {
                content: "Delete",
                loading: isDeleting,
                disabled: !qrCode.id || !qrCode || isSaving || isDeleting,
                destructive: true,
                outline: true,
                onAction: () => submit({}, { method: "delete" }),
              },
            ]}
            primaryAction={{
              content: "Save",
              loading: isSaving,
              disabled: !isDirty || isSaving || isDeleting,
              onAction: handleSave,
            }}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
