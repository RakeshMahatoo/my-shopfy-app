import { useLoaderData, Form, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
// import { useState, useEffect } from "react";

export const loader = async ({ request }) => {
  // browaer -> loader() -> fetch data -> send data to react component
  const { admin } = await authenticate.admin(request); //  After authentication, Shopify gives us an admin object.
  console.log(admin);

  //  we communicate with the shopify admin api
  //Give me the first 10 products and for each product return id, title and status."
  const response = await admin.graphql(`
  query {
    products(first: 50) {
      edges {
        node {
          id
          title
          status
          vendor
          featuredImage {
            url
          }
          variants(first: 1) {
            edges {
              node {
                price
                inventoryQuantity
              }
            }
          } 
        }
      }
    }
  }
`);

  const responseJson = await response.json(); // convert into json javascript object
  console.log(responseJson.data.products.edges.map(({ node }) => node.title));

  return {
    products: responseJson.data.products.edges, // loader sends this data to the react component
  };
};

// post button action()
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const title = formData.get("title");
  const vendor = formData.get("vendor");
  const productType = formData.get("productType");

  const response = await admin.graphql(
    `mutation productCreate($input: ProductCreateInput!) {
      productCreate(product: $input) {
        product {
          id
          title
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        input: {
          title,
          vendor,
          productType,
        }
      }
    }
  );

  const responseJson = await response.json();
  const userErrors = responseJson.data?.productCreate?.userErrors;

  if (userErrors?.length > 0) {
    return { error: userErrors[0].message };
  }

  return { success: true };
};



export default function Index() {
  const { products } = useLoaderData();
  const navigation = useNavigation();

  const activeProducts = products.filter(({ node }) => node.status === "ACTIVE");
  const totalInventory = products.reduce((sum, { node }) => {
    return sum + (node.variants.edges[0]?.node.inventoryQuantity || 0);
  }, 0);

  return (
    <div style={{
      padding: "40px",
      maxWidth: "1200px",
      margin: "0 auto",
      fontFamily: "system-ui, -apple-system, sans-serif",
      backgroundColor: "#f4f6f8",
      minHeight: "100vh",
    }}>

      {/* Navbar */}
      <div style={{
        background: "#111827",
        color: "white",
        padding: "20px 30px",
        borderRadius: "16px",
        marginBottom: "30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <h2 style={{ margin: 0 }}>🛍️ My Store Dashboard</h2>
        <div style={{
          background: "#1f2937",
          padding: "10px 15px",
          borderRadius: "10px",
        }}>
          📦 Total Products: {products.length}
        </div>
      </div>

      {/* Statistics */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "20px",
        marginBottom: "30px",
      }}>
        <div style={statCard}>
          <h3>Total Products</h3>
          <h1>{products.length}</h1>
        </div>
        <div style={statCard}>
          <h3>Active Products</h3>
          <h1>{activeProducts.length}</h1>
        </div>
        <div style={statCard}>
          <h3>Total Inventory</h3>
          <h1>{totalInventory}</h1>
        </div>
      </div>

      {/* Create Product */}
      <Form method="post">
        <div style={{
          background: "white",
          padding: "25px",
          borderRadius: "16px",
          marginBottom: "30px",
          boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
        }}>
          <h2>➕ Create Product</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px",
            marginBottom: "20px",
          }}>
            <input type="text" name="title" placeholder="Product title" required style={inputStyle} />
            <input type="text" name="vendor" placeholder="Vendor" required style={inputStyle} />
            <input type="text" name="productType" placeholder="Product Type" required style={inputStyle} />
            <input type="number" name="price" placeholder="Price (e.g. 19.99)" required style={inputStyle} />
            <input type="number" name="inventory" placeholder="Inventory quantity" required style={inputStyle} />
          </div>
          <button
            type="submit"
            disabled={navigation.state === "submitting"}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "15px 25px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
            }}>
            {navigation.state === "submitting" ? "Creating..." : "➕ Create Product"}
          </button>
        </div>
      </Form>

      {/* Product Grid */}
      <h2>📦 All Products</h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "24px",
      }}>
        {products.map(({ node }) => (
          <div key={node.id} style={{
            padding: "20px",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
            border: "1px solid rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}>
            {node.featuredImage && (
              <img
                src={node.featuredImage.url}
                alt={node.title}
                style={{
                  width: "100%",
                  height: "220px",
                  objectFit: "cover",
                  borderRadius: "10px",
                  marginBottom: "10px",
                }}
              />
            )}
            <h3 style={{ margin: 0, color: "#1f2937", fontSize: "1.15rem", fontWeight: "700" }}>
              {node.title}
            </h3>
            <span style={{
              backgroundColor: node.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
              color: node.status === "ACTIVE" ? "#166534" : "#991b1b",
              padding: "4px 10px",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: "600",
              width: "fit-content",
            }}>
              {node.status}
            </span>
            <p style={{ color: "#6b7280", marginTop: "5px" }}>
              Vendor: {node.vendor}
            </p>
            <div style={{ marginTop: "auto", paddingTop: "15px", borderTop: "1px dashed #e5e7eb" }}>
              <p style={{ margin: 0, color: "#2563eb", fontSize: "1.4rem", fontWeight: "800" }}>
                ${node.variants.edges[0]?.node.price}
              </p>
              <p style={{ marginTop: "8px", color: "#10b981", fontWeight: "600" }}>
                📦 {node.variants.edges[0]?.node.inventoryQuantity} in stock
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const statCard = {
  background: "white",
  padding: "20px",
  borderRadius: "16px",
  boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
};

const inputStyle = {
  width: "100%",
  padding: "12px 15px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  fontSize: "15px",
};

/*
Browser -> loader() -> authenticate.admin() -> admin.graphql() -> shopify store -> json rewsponse -> useLoaderData() -> product.map() -> Display products 
*/



