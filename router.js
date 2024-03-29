const express = require("express");
const router = express.Router();
const db = require("./database");

const {
  signupValidation,
  loginValidation,
  createListValid,
} = require("./validation");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = express();

const moment = require("moment");

const cookieSession = require("cookie-session");
const { json } = require("body-parser");

router.post("/register", signupValidation, async (req, res, next) => {
  let connection = db()
  // let db = await connectDB();
  connection.query(
    `SELECT * FROM users WHERE LOWER(email) = LOWER(${connection.escape(
      req.body.email
    )});`,
    (err, result) => {
      console.log(11111)
      console.log(result)
      if (result.length) {
        connection.destroy()
        return res.status(409).send({
          msg: "This user is already in use!",
        });
      } else {
        // username is available
        bcrypt.hash(req.body.password, 10, (err, hash) => {
          if (err) {
            connection.destroy()
            return res.status(500).send({
              msg: err,
            });
          } else {
            // has hashed pw => add to database
            connection.query(
              `INSERT INTO users (name, email, password, role) VALUES ('${
                req.body.name
              }', ${connection.escape(req.body.email)}, ${connection.escape(hash)},'${
                req.body.role
              }')`,
              (err, result) => {
                if (err) {
                  throw err;
                  connection.destroy()
                  return res.status(400).send({
                    msg: err,
                  });
                }
                connection.destroy()
                return res.status(201).send({
                  msg: "The user has been registerd with us!",
                });
              }
            );
          }
        });
      }
    }
  );
});

app.use(
  cookieSession({
    name: "session",
    keys: ["key1", "key2"],
    maxAge: 3600 * 1000, // 1hr
  })
);

router.post("/login", loginValidation, (req, res, next) => {
  let connection = db()
  connection.query(
    `SELECT * FROM users WHERE email = ${connection.escape(req.body.email)};`,
    (err, result) => {
      // user does not exists
      if (err) {
        throw err;
        connection.destroy()
        return res.status(400).send({
          msg: err,
        });
      }
      if (!result.length) {
        connection.destroy()
        return res.status(401).send({
          msg: "Email or password is incorrect!",
        });
      }
      // check password
      bcrypt.compare(
        req.body.password,
        result[0]["password"],
        (bErr, bResult) => {
          // wrong password
          if (bErr) {
            throw bErr;
            return res.status(401).send({
              msg: "Email or password is incorrect!",
            });
          }
          if (bResult) {
            const token = jwt.sign(
              { id: result[0].id },
              "the-super-strong-secrect",
              { expiresIn: "1h" }
            );
            // db.query(
            //     `UPDATE users SET last_login = now() WHERE id = '${result[0].id}'`
            // );
            // req.session.isLoggedIn = true;
            // req.session.userID = rows[0].id;
            connection.destroy()
            return res.status(200).send({
              msg: "Logged in!",
              token,
              user: result[0],
            });
          }
          connection.destroy()
          return res.status(401).send({
            msg: "Username or password is incorrect!",
          });
        }
      );
    }
  );
});
router.get("/get-user", signupValidation, (req, res, next) => {
  let connection = db()

  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer") ||
    !req.headers.authorization.split(" ")[1]
  ) {
    connection.destroy()
    return res.status(422).json({
      message: "Please provide the token",
    });
  }
  const theToken = req.headers.authorization.split(" ")[1];
  const decoded = jwt.verify(theToken, "the-super-strong-secrect");
  if(decoded.id){
    connection.query(
      "SELECT * FROM users where id=?",
      decoded.id,
      function (error, results, fields) {
        if (error) throw error;
        connection.destroy()
        return res.send({
          error: false,
          data: results[0],
          message: "Fetch Successfully.",
        });
      }
    );
  }
});
router.get("/logout", (req, res) => {
  //session destroy
  req.session = null;
  // res.redirect('/');
});

////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post("/create_products", (req, res) => {
  let connection = db()
  const { name, description, image, CO2, type_products, category_id } =
    req.body;

  const product = { name, description, image, CO2, type_products, category_id };
  console.log(product);
  connection.query("INSERT INTO products SET ?", product, (error, results, fields) => {
    if (error) throw error;
    connection.destroy()
    res.send({
      success: true,
      message: "Product added successfully.",
    });
  });
});
router.get("/products_list", (req, res) => {
  let connection = db()
  const { category_id, name, page, perPage } = req.query;
  console.log("name", name);
  let query = `SELECT p.*, c.name AS category_name
  FROM products p
  JOIN product_categories c ON p.category_id = c.id`;
  let countQuery = `SELECT COUNT(*) as count FROM products p JOIN product_categories c ON p.category_id = c.id`;
  let params = [];
  let countParams = [];

  // Apply filters
  if (category_id != null && name != null) {
    query += " WHERE p.category_id = ? AND p.name LIKE ?";
    countQuery += " WHERE p.category_id = ? AND p.name LIKE ?";
    params = [category_id, `%${name}%`];
    countParams = [category_id, `%${name}%`];
  } else if (category_id != null) {
    query += " WHERE p.category_id = ?";
    countQuery += " WHERE p.category_id = ?";
    params = [category_id];
    countParams = [category_id];
  } else if (name != null) {
    query += " WHERE p.name LIKE ?";
    countQuery += " WHERE p.name LIKE ?";
    params = [`%${decodeURIComponent(name)}%`];
    countParams = [`%${decodeURIComponent(name)}%`];
  }
  // (name != null) {
  //   query += " WHERE p.name LIKE ?";
  //   countQuery += " WHERE p.name LIKE ?";
  //   params = [`%${name}%`];
  //   countParams = [`%${name}%`];
  // }

  // Execute count query to get total number of results
  connection.query(countQuery, countParams, (error, countResults, fields) => {
    if (error) throw error;

    const totalResults = countResults[0].count;

    // Calculate limit and offset based on page and perPage
    const limit = parseInt(perPage) || 10;
    const offset = (parseInt(page) - 1) * limit || 0;

    // Add limit and offset to query
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    connection.query(query, params, (error, results, fields) => {
      if (error) throw error;
      if (results.length === 0) {
        connection.destroy()
        res.send({
          success: false,
          data: [],
          message: "Fetch error.",
        });
      } else {
        connection.destroy()
        res.send({
          success: true,
          data: results,
          totalResults,
          currentPage: parseInt(page) || 1,
          totalPages: Math.ceil(totalResults / limit),
          message: "Fetch Successfully.",
        });
      }
    });
  });
});
// router.get("/products_list", (req, res) => {
//   const { category_id, name } = req.query;
//   let query = `SELECT p.*, c.name AS category_name
//   FROM products p
//   JOIN product_categories c ON p.category_id = c.id`;
//   let params = [];
//   if (category_id != null && name != null) {
//     query += " WHERE category_id = ? AND name LIKE ?";
//     params = [category_id, `%${name}%`];
//   } else if (category_id != null) {
//     query += " WHERE category_id = ?";
//     params = [category_id];
//   } else if (name != null) {
//     query += " WHERE name LIKE ?";
//     params = [`%${name}%`];
//   }

//   db.query(query, params, (error, results, fields) => {
//     if (error) throw error;
//     if (results.length === 0) {
//       res.send({
//         success: false,
//         data: [],
//         message: "Fetch error.",
//       });
//     } else {
//       res.send({
//         success: true,
//         data: results,
//         message: "Fetch Successfully.",
//       });
//     }
//   });
// });
router.get("/categories", (req, res) => {
  let connection = db()
  connection.query("SELECT * FROM product_categories", (error, results, fields) => {
    if (error) throw error;
    if (results.length === 0) {
      connection.destroy()
      res.send({
        success: false,
        data: [],
        message: "Fetch error.",
      });
    } else {
      connection.destroy()
      res.send({
        success: true,
        data: results,
        message: "Fetch Successfully.",
      });
    }
  });
});
router.get("/info_product", (req, res) => {
  let connection = db()
  req.query.id;
  connection.query(
    `SELECT p.*, c.name AS category_name
  FROM products p
  JOIN product_categories c ON p.category_id = c.id
  WHERE p.id = ${req.query.id};`,
    (error, results, fields) => {
      if (error) throw error;
      if (results.length === 0) {
        connection.destroy()
        res.send({
          success: false,
          data: [],
          message: "Fetch error.",
        });
      } else {
        connection.destroy()
        res.send({
          success: true,
          data: results,
          message: "Fetch Successfully.",
        });
      }
    }
  );
});

router.delete("/delete_product", (req, res, next) => {
  let connection = db()
  const id = req.query.id;
  console.log(id);

  connection.query(`DELETE FROM products WHERE id = '${id}'`, (err, result) => {
    if (result && result.affectedRows > 0) {
      // <-- Check if at least one row was deleted
      connection.destroy()
      res.send({
        success: true,
        message: "Delete Successfully.",
      });
    } else {
      connection.destroy()
      res.send({
        success: false,
        message: "Delete Unsuccessful.",
      });
    }
  });
});
router.get("/check_product", (req, res) => {
  let connection = db()
  const value_co2 = req.query.value_co2;
  const type = req.query.type;
  const id = req.query.id;

  connection.query(
    `SELECT *
  FROM products
  WHERE CO2 BETWEEN ${value_co2}-5 AND ${value_co2}
  AND category_id = ${type} AND id != ${id}
  ORDER BY CO2 DESC
  LIMIT 3`,
    (error, results, fields) => {
      if (error) throw error;
      if (results.length === 0) {
        connection.destroy()
        res.send({
          success: false,
          data: [],
          message: "Fetch error.",
        });
      } else {
        connection.destroy()
        res.send({
          success: true,
          data: results,
          message: "Fetch Successfully.",
        });
      }
    }
  );
});

{
  /*
SELECT c.username AS user_name, c.point, p.name AS product_name, p.CO2, p.image, p.category_id, l.* FROM list_productbyuser l RIGHT JOIN customers c ON l.userId = c.id INNER JOIN products p ON l.product_id = p.id;
*/
}
router.get("/select_product", (req, res) => {
  let connection = db()
  const in_id = req.query.in_id;
  console.log(in_id);

  connection.query(
    `SELECT name,CO2,image
    FROM products
    WHERE id IN (${in_id});`,
    (error, results, fields) => {
      if (error) throw error;
      if (results.length === 0) {
        connection.destroy()
        res.send({
          success: false,
          data: [],
          message: "Fetch error.",
        });
      } else {
        connection.destroy()
        res.send({
          success: true,
          data: results,
          message: "Fetch Successfully.",
        });
      }
    }
  );
});
// INSERT INTO list_productbyuser (userId, product_id) VALUES (1, 100), (1, 101), (2, 102);
router.post("/create_listitem", (req, res) => {
  let connection = db()
  const { userId, product_id } = req.body;

  const product = { userId, product_id };
  connection.query(
    "INSERT INTO list_productbyuser SET ?",
    product,
    (error, results, fields) => {
      if (error) throw error;
      connection.destroy()
      res.send({
        success: true,
        message: "Product added successfully.",
      });
    }
  );
});

router.post("/create_cart", (req, res) => {
  let connection = db()
  const { user_id, product_id, count, active } = req.body;

  const product = { user_id, product_id, count, active };
  connection.query("INSERT INTO cart SET ?", product, (error, results, fields) => {
    if (error) throw error;
    connection.destroy()
    res.send({
      success: true,
      message: "Product added successfully.",
    });
  });
});

router.get("/cart_count", (req, res) => {
  let connection = db()
  req.query.user_id;
  connection.query(
    `SELECT SUM(count) AS total_count FROM cart WHERE active = 1 AND user_id = ${req.query.user_id};`,
    (error, results, fields) => {
      if (error) throw error;
      if (results.length === 0) {
        connection.destroy()
        res.send({
          success: false,
          data: [],
          message: "Fetch error.",
        });
      } else {
        connection.destroy()
        res.send({
          success: true,
          data: results,
          message: "Fetch Successfully.",
        });
      }
    }
  );
});

router.get("/cart_list", (req, res) => {
  let connection = db()
  const userId = req.query.user_id; // Store user_id in a variable

  if (!userId) {
    connection.destroy()
    // If user_id is not provided in the query parameters, return an error response.
    return res.status(400).json({
      success: false,
      data: [],
      message: "user_id is missing in the query parameters.",
    });
  }

  connection.query(
    `SELECT
      MAX(cart.id) AS id,
      users.name AS user_name,
      products.name AS product_name,
      CAST(SUM(products.CO2 * cart.count) AS DOUBLE) AS total_CO2,
      products.CO2 AS total_CO2_def,
      MAX(products.image) AS image,
      CAST(SUM(cart.count) AS SIGNED INTEGER) AS total_cart_count,
      MAX(cart.active) AS active
    FROM
      cart
    JOIN
      users ON cart.user_id = users.id
    JOIN
      products ON cart.product_id = products.id
    WHERE
      cart.user_id = ? AND active = 1
    GROUP BY
      users.name, products.name, products.CO2;`,
    [userId], // Pass user_id as a parameter to prevent SQL injection
    (error, results, fields) => {
      if (error) {
        console.error(error);
        connection.destroy()
        return res.status(500).json({
          success: false,
          data: [],
          message: "An error occurred while fetching the cart list.",
        });
      }

      if (results.length === 0) {
        connection.destroy()
        return res.status(404).json({
          success: false,
          data: [],
          message: "Cart list not found for the specified user_id.",
        });
      }
      connection.destroy()
      res.status(200).json({
        success: true,
        data: results,
        message: "Cart list fetched successfully.",
      });
    }
  );
});


router.put("/update_cart/:id", (req, res) => {
  let connection = db()
  const cartId = req.params.id;
  const { total_cart_count } = req.body; // Assuming you're sending this data in the request body
  console.log(req.body, req.params);
  connection.query(
    `UPDATE cart
     SET count = ?
     WHERE id = ?`,
    [total_cart_count, cartId],
    (error, results, fields) => {
      if (error) {
        console.error("Error updating cart item:", error);
        connection.destroy()
        res
          .status(500)
          .send({ success: false, message: "Error updating cart item." });
      } else {
        connection.destroy()
        res.send({ success: true, message: "Cart item updated successfully." });
      }
    }
  );
});

router.post("/update_cart_active", (req, res) => {
  let connection = db()
  console.log(req.body);
  const updateData = req.body.updatedCartItems; // Assuming the request body contains the update array
  const user_id = req.body.user_id;
  if (!updateData || !Array.isArray(updateData)) {
    connection.destroy()
    res.status(400).json({
      success: false,
      message: "Invalid update data format.",
    });
    return;
  }

  const updatePromises = updateData.map((item) => {
    return new Promise((resolve, reject) => {
      const id = item.id;
      const totalCartCount = item.total_cart_count;
      const user_id = item.user_id;
      let connection = db()
      connection.query(
        `UPDATE cart
        SET active = ${0}  AND id = ${id} WHERE user_id = ${user_id}`,
        (error, results, fields) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        }
      );
    });
  });

  Promise.all(updatePromises)
    .then(() => {
      connection.destroy()
      res.json({
        success: true,
        message: "Cart active status updated successfully.",
      });
    })
    .catch((error) => {
      connection.destroy()
      res.status(500).json({
        success: false,
        message: "Error updating cart active status.",
        error: error.message,
      });
    });
});

router.post("/historyCart", (req, res) => {
  let connection = db()
  const { name, dataset, total_CO2, user_id } = req.body.param;

  const insertQuery = `INSERT INTO historycart (name, dataset, total_CO2, user_id) VALUES (?, ?, ?, ?)`;

  connection.query(insertQuery, [name, dataset, total_CO2, user_id], (err, result) => {
    if (err) {
      console.error(err);
      connection.destroy()
      res.status(500).send("Error inserting data into historyCart");
    } else {
      connection.destroy()
      res.status(201).send("Data inserted into historyCart");
    }
  });
});

router.delete("/delete_Cart", (req, res, next) => {
  let connection = db()
  const userId = req.query.user_id;
  console.log(userId);
  connection.query(`DELETE FROM cart WHERE user_id = ${userId}`, (err, result) => {
    if (result && result.affectedRows > 0) {
      // <-- Check if at least one row was deleted
      connection.destroy()
      res.send({
        success: true,
        message: "Delete Successfully.",
      });
    } else {
      connection.destroy()
      res.send({
        success: false,
        message: "Delete Unsuccessful.",
      });
    }
  });
});
router.get("/historycart", (req, res) => {
  let connection = db()
  req.query.user_id;
  connection.query(
    `SELECT * FROM historycart WHERE user_id = ${req.query.user_id};`,
    (error, results, fields) => {
      if (error) throw error;
      if (results.length === 0) {
        connection.destroy()
        res.send({
          success: false,
          data: [],
          message: "Fetch error.",
        });
      } else {
        connection.destroy()
        res.send({
          success: true,
          data: results,
          message: "Fetch Successfully.",
        });
      }
    }
  );
});

//   SELECT
//   users.name AS user_name,
//   products.name AS name,
//   (products.CO2 * cart.count) AS CO2,
//   products.image AS image,
//   cart.count AS cart_count,
//   cart.active
// FROM
//   cart
// JOIN
//   users ON cart.user_id = users.id
// JOIN
//   products ON cart.product_id = products.id
// WHERE
//   cart.user_id = 1;

// router.get("/image_preview", async (req, res) => {
//   req.query.image;

//   const ress = cloudinary.uploader.upload(req.query.image, {public_id: "olympic_flag"})

//   ress.then((data) => {
//     res.send(data.secure_url)

//   }).catch((err) => {
//     console.log(err);
//   });
//   const url = cloudinary.url("olympic_flag", {
//     width: 100,
//     height: 150,
//     Crop: 'fill'
//   });
//   console.log(url)
//   // const url = await getDownloadURL(fileRef);
//     // res.send({
//     //   success: false,
//     //   data: [],
//     //   message: "Fetch error.",
//     // });

// });

module.exports = router;
