const http = require("http");
const url = require("url");


let phones = [
  { id: 1, name: "iPhone 14", brand: "Apple", price: 1200, stock: 10 },
  { id: 2, name: "Galaxy S23", brand: "Samsung", price: 900, stock: 15 },
  { id: 3, name: "Pixel 7", brand: "Google", price: 800, stock: 5 },
];


let cart = [];


const sendResponse = (res, statusCode, data) => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};


const handlePhonesRoute = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query;

  if (req.method === "GET") {
    let result = phones;

    if (query.brand) {
      result = result.filter((phone) => phone.brand === query.brand);
    }

    if (query.maxPrice) {
      const maxPrice = parseFloat(query.maxPrice);
      result = result.filter((phone) => phone.price <= maxPrice);
    }

    sendResponse(res, 200, result);
  } else if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const newPhone = JSON.parse(body);
        const { name, brand, price, stock } = newPhone;

        if (!name || !brand || typeof price !== "number" || typeof stock !== "number") {
          sendResponse(res, 400, { error: "Invalid phone data" });
          return;
        }

        const id = phones.length ? phones[phones.length - 1].id + 1 : 1;
        const phone = { id, name, brand, price, stock };
        phones.push(phone);
        sendResponse(res, 201, phone);
      } catch (error) {
        sendResponse(res, 400, { error: "Invalid JSON format" });
      }
    });
  } else {
    sendResponse(res, 405, { error: "Method Not Allowed" });
  }
};


const handleSinglePhoneRoute = (req, res, id) => {
  const phone = phones.find((p) => p.id === parseInt(id));

  if (!phone) {
    sendResponse(res, 404, { error: "Phone not found" });
    return;
  }

  if (req.method === "GET") {
    sendResponse(res, 200, phone);
  } else if (req.method === "PUT") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const updates = JSON.parse(body);

        if (!Object.keys(updates).length) {
          sendResponse(res, 400, { error: "No data to update" });
          return;
        }

        Object.assign(phone, updates);
        sendResponse(res, 200, phone);
      } catch (error) {
        sendResponse(res, 400, { error: "Invalid JSON format" });
      }
    });
  } else if (req.method === "DELETE") {
    phones = phones.filter((p) => p.id !== phone.id);
    sendResponse(res, 200, phone);
  } else {
    sendResponse(res, 405, { error: "Method Not Allowed" });
  }
};


const handleCartRoute = (req, res) => {
  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const { phoneId, quantity } = JSON.parse(body);
        const phone = phones.find((p) => p.id === parseInt(phoneId));

        if (!phone) {
          sendResponse(res, 404, { error: "Phone not found" });
          return;
        }

        if (phone.stock < quantity) {
          sendResponse(res, 400, { error: "Not enough stock" });
          return;
        }

        const cartItem = cart.find((item) => item.phoneId === phone.id);

        if (cartItem) {
          cartItem.quantity += quantity;
        } else {
          cart.push({ phoneId: phone.id, quantity });
        }


        phone.stock -= quantity;
        sendResponse(res, 200, cart);
      } catch (error) {
        sendResponse(res, 400, { error: "Invalid JSON format" });
      }
    });
  } else if (req.method === "GET") {
    const cartDetails = cart.map((item) => {
      const phone = phones.find((p) => p.id === item.phoneId);
      return {
        phoneId: item.phoneId,
        quantity: item.quantity,
        totalPrice: phone.price * item.quantity,
      };
    });
    sendResponse(res, 200, cartDetails);
  } else if (req.method === "DELETE") {
    const parsedUrl = url.parse(req.url, true);
    const { phoneId } = parsedUrl.query;

    const cartIndex = cart.findIndex((item) => item.phoneId === parseInt(phoneId));

    if (cartIndex === -1) {
      sendResponse(res, 404, { error: "Item not found in cart" });
      return;
    }

    const [removedItem] = cart.splice(cartIndex, 1);
    const phone = phones.find((p) => p.id === removedItem.phoneId);
    phone.stock += removedItem.quantity;
    sendResponse(res, 200, cart);
  } else {
    sendResponse(res, 405, { error: "Method Not Allowed" });
  }
};


const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === "/phones") {
    handlePhonesRoute(req, res);
  } else if (parsedUrl.pathname.startsWith("/phones/")) {
    const id = parsedUrl.pathname.split("/")[2];
    handleSinglePhoneRoute(req, res, id);
  } else if (parsedUrl.pathname === "/cart") {
    handleCartRoute(req, res);
  } else {
    sendResponse(res, 404, { error: "Not Found" });
  }
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
