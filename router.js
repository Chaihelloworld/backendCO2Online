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

router.post("/register", signupValidation, (req, res, next) => {
  db.query(
    `SELECT * FROM users WHERE LOWER(email) = LOWER(${db.escape(
      req.body.email
    )});`,
    (err, result) => {
      if (result.length) {
        return res.status(409).send({
          msg: "This user is already in use!",
        });
      } else {
        // username is available
        bcrypt.hash(req.body.password, 10, (err, hash) => {
          if (err) {
            return res.status(500).send({
              msg: err,
            });
          } else {
            // has hashed pw => add to database
            db.query(
              `INSERT INTO users (name, email, password) VALUES ('${
                req.body.name
              }', ${db.escape(req.body.email)}, ${db.escape(hash)})`,
              (err, result) => {
                if (err) {
                  throw err;
                  return res.status(400).send({
                    msg: err,
                  });
                }
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
  db.query(
    `SELECT * FROM users WHERE email = ${db.escape(req.body.email)};`,
    (err, result) => {
      // user does not exists
      if (err) {
        throw err;
        return res.status(400).send({
          msg: err,
        });
      }
      if (!result.length) {
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
            return res.status(200).send({
              msg: "Logged in!",
              token,
              user: result[0],
            });
          }
          return res.status(401).send({
            msg: "Username or password is incorrect!",
          });
        }
      );
    }
  );
});
router.post("/get-user", signupValidation, (req, res, next) => {
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer") ||
    !req.headers.authorization.split(" ")[1]
  ) {
    return res.status(422).json({
      message: "Please provide the token",
    });
  }
  const theToken = req.headers.authorization.split(" ")[1];
  const decoded = jwt.verify(theToken, "the-super-strong-secrect");
  db.query(
    "SELECT * FROM users where id=?",
    decoded.id,
    function (error, results, fields) {
      if (error) throw error;
      return res.send({
        error: false,
        data: results[0],
        message: "Fetch Successfully.",
      });
    }
  );
});
router.get("/logout", (req, res) => {
  //session destroy
  req.session = null;
  // res.redirect('/');
});


////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post("/create_products", (req, res) => {
  const { name, description, image, CO2, type_products, category_id } =
    req.body;

  const product = { name, description, image, CO2, type_products, category_id };
  console.log(product);
  db.query("INSERT INTO products SET ?", product, (error, results, fields) => {
    if (error) throw error;
    res.send({
      success: true,
      message: "Product added successfully.",
    });
  });
});
router.get("/products_list", (req, res) => {
  const { category_id, name, page, perPage } = req.query;
  console.log('name',name)
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
  } else if 
  (name != null) {
    query += " WHERE p.name LIKE ?";
    countQuery += " WHERE p.name LIKE ?";
    params = [`%${ decodeURIComponent(name)}%`];
    countParams = [`%${decodeURIComponent(name)}%`];
  }
  // (name != null) {
  //   query += " WHERE p.name LIKE ?";
  //   countQuery += " WHERE p.name LIKE ?";
  //   params = [`%${name}%`];
  //   countParams = [`%${name}%`];
  // }

  // Execute count query to get total number of results
  db.query(countQuery, countParams, (error, countResults, fields) => {
    if (error) throw error;

    const totalResults = countResults[0].count;

    // Calculate limit and offset based on page and perPage
    const limit = parseInt(perPage) || 10;
    const offset = (parseInt(page) - 1) * limit || 0;

    // Add limit and offset to query
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    db.query(query, params, (error, results, fields) => {
      if (error) throw error;
      if (results.length === 0) {
        res.send({
          success: false,
          data: [],
          message: "Fetch error.",
        });
      } else {
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
  db.query("SELECT * FROM product_categories", (error, results, fields) => {
    if (error) throw error;
    if (results.length === 0) {
      res.send({
        success: false,
        data: [],
        message: "Fetch error.",
      });
    } else {
      res.send({
        success: true,
        data: results,
        message: "Fetch Successfully.",
      });
    }
  });
});
router.get("/info_product", (req, res) => {
  req.query.id;
  db.query(
    `SELECT p.*, c.name AS category_name
  FROM products p
  JOIN product_categories c ON p.category_id = c.id
  WHERE p.id = ${req.query.id};`,
    (error, results, fields) => {
      if (error) throw error;
      if (results.length === 0) {
        res.send({
          success: false,
          data: [],
          message: "Fetch error.",
        });
      } else {
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
  const id = req.query.id;
  console.log(id);

  db.query(`DELETE FROM products WHERE id = '${id}'`, (err, result) => {
    if (result && result.affectedRows > 0) {
      // <-- Check if at least one row was deleted
      res.send({
        success: true,
        message: "Delete Successfully.",
      });
    } else {
      res.send({
        success: false,
        message: "Delete Unsuccessful.",
      });
    }
  });
});
router.get("/check_product", (req, res) => {
const value_co2 = req.query.value_co2;
const type = req.query.type;
const id = req.query.id;

  db.query(`SELECT *
  FROM products
  WHERE CO2 BETWEEN ${value_co2}-5 AND ${value_co2}
  AND category_id = ${type} AND id != ${id}
  ORDER BY CO2 DESC
  LIMIT 3`, (error, results, fields) => {
    if (error) throw error;
    if (results.length === 0) {
      res.send({
        success: false,
        data: [],
        message: "Fetch error.",
      });
    } else {
      res.send({
        success: true,
        data: results,
        message: "Fetch Successfully.",
      });
    }
  });
});

{/*
SELECT c.username AS user_name, c.point, p.name AS product_name, p.CO2, p.image, p.category_id, l.* FROM list_productbyuser l RIGHT JOIN customers c ON l.userId = c.id INNER JOIN products p ON l.product_id = p.id;
*/}
router.get("/select_product", (req, res) => {
  const in_id = req.query.in_id;
console.log(in_id)
  
    db.query(`SELECT name,CO2,image
    FROM products
    WHERE id IN (${in_id});`, (error, results, fields) => {
      if (error) throw error;
      if (results.length === 0) {
        res.send({
          success: false,
          data: [],
          message: "Fetch error.",
        });
      } else {
        res.send({
          success: true,
          data: results,
          message: "Fetch Successfully.",
        });
      }
    });
  });
  // INSERT INTO list_productbyuser (userId, product_id) VALUES (1, 100), (1, 101), (2, 102);
  router.post("/create_listitem", (req, res) => {
    const { userId, product_id} =
      req.body;
  
    const product = { userId, product_id};
    db.query("INSERT INTO list_productbyuser SET ?", product, (error, results, fields) => {
      if (error) throw error;
      res.send({
        success: true,
        message: "Product added successfully.",
      });
    });
  });
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
