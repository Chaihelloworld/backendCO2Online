const express = require("express");
const router = express.Router();
const db = require("./database");
const { getDownloadURL, ref } = require('firebase/storage');
const  storage  = require('./firebase');
const {
  signupValidation,
  loginValidation,
  createListValid,
} = require("./validation");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = express();
const cloudinary = require('cloudinary').v2;

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
router.post("/create_list", createListValid, (req, res, next) => {
  db.query(
    `INSERT INTO roomer ( schoolname,fullname, phone, email, address, member, amount_month, occupation,billelec,numbillelec
      ,name_using_w,num_using_w,using_pow,using_pow_amount,guss_amount,guss_size,guss_using,class,num,using_powBenzin,using_pow_amountBenzin) VALUES ( 
        '${req.body.schoolname}',    
        '${req.body.fullname}',
            '${req.body.phone}',
            '${req.body.email}',
            '${req.body.address}',
            '${req.body.member}',
            '${req.body.amount_month}',
            '${req.body.occupation}',
            '${req.body.billelec}',
            '${req.body.numbillelec}',
            '${req.body.name_using_w}',
            '${req.body.num_using_w}',
            '${req.body.using_pow}',
            '${req.body.using_pow_amount}',
            '${req.body.guss_amount}',
            '${req.body.guss_size}',
            '${req.body.guss_using}',
            '${req.body.class}',
            '${req.body.num}',
            '${req.body.using_powBenzin}',
            '${req.body.using_pow_amountBenzin}'
            )`,
    (err, result) => {
      if (result) {
        return res.status(200).send({
          msg: "seccess : true \n status API server 500 is ready!!",
        });
      } else {
        // username is available
        return res.status(500).send({
          msg: err,
        });
      }
    }
  );
});
router.post("/create_room", (req, res, next) => {
  db.query(
    `INSERT INTO room ( userid, name, link) VALUES ( '${req.body.userid}', '${req.body.name}', '${req.body.link}')`,

    (err, result) => {
      if (result) {
        return res.status(200).send({
          msg: "status ok",
        });
      } else {
        // username is available
        return res.status(500).send({
          msg: err,
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
router.get("/getlisr_roomer", (req, res, next) => {
  // if (
  //   !req.headers.authorization ||
  //   !req.headers.authorization.startsWith("Bearer") ||
  //   !req.headers.authorization.split(" ")[1]
  // ) {
  //   return res.status(422).json({
  //     message: "Please provide the token",
  //   });
  // }
  // const theToken = req.headers.authorization.split(" ")[1];
  // const decoded = jwt.verify(theToken, "the-super-strong-secrect");
  db.query(
    "SELECT * FROM roomer ",

    function (error, results, fields) {
      if (error) throw error;
      return res.send({
        error: false,
        data: results,
        message: "Fetch Successfully.",
      });
    }
  );
});
router.get("/get_test", (req, res, next) => {
  // if (
  //   !req.headers.authorization ||
  //   !req.headers.authorization.startsWith("Bearer") ||
  //   !req.headers.authorization.split(" ")[1]
  // ) {
  //   return res.status(422).json({
  //     message: "Please provide the token",
  //   });
  // }
  // const theToken = req.headers.authorization.split(" ")[1];
  // const decoded = jwt.verify(theToken, "the-super-strong-secrect");
  db.query(
    "SELECT * FROM name ",

    function (error, results, fields) {
      if (error) throw error;
      return res.send({
        error: false,
        data: results,
        message: "Fetch Successfully.",
      });
    }
  );
});

router.get("/resource", (req, res, next) => {
  // if (
  //   !req.headers.authorization ||
  //   !req.headers.authorization.startsWith("Bearer") ||
  //   !req.headers.authorization.split(" ")[1]
  // ) {
  //   return res.status(422).json({
  //     message: "Please provide the token",
  //   });
  // }
  // const theToken = req.headers.authorization.split(" ")[1];
  // const decoded = jwt.verify(theToken, "the-super-strong-secrect");

  moment().utcOffset("+07:00");
  console.log(moment().format("YYYY:MM:DD hh:mm:ss"));
  console.log(moment().year());
  var year;
  var sql;
  if (!req.query.year) {
    // year = '202'
    // year = moment().year();
    sql = `SELECT * FROM resource_map`;
  } else {
    year = req.query.year;
    sql = `SELECT * FROM resource_map where YEAR(created_date) ='${year}'`;
  }

  // var extened = `where YEAR(created_date) ='${year}'`
  db.query(
    sql,

    function (error, results, fields) {
      if (error) throw error;

      for (let i = 0; i < results.length; i++) {
        // console.log(JSON.parse(results[i]['raw']))
        try {
          results[i]["raw"] = JSON.parse(results[i]["raw"]);
        } catch (error) {}
      }
      return res.send({
        error: false,
        success: results.length == 0 ? false : true,
        data: results,
        message: "Fetch Successfully.",
      });
    }
  );
});

router.get("/resource/report", (req, res, next) => {
  // if (
  //   !req.headers.authorization ||
  //   !req.headers.authorization.startsWith("Bearer") ||
  //   !req.headers.authorization.split(" ")[1]
  // ) {
  //   return res.status(422).json({
  //     message: "Please provide the token",
  //   });
  // }
  // const theToken = req.headers.authorization.split(" ")[1];
  // const decoded = jwt.verify(theToken, "the-super-strong-secrect");

  moment().utcOffset("+07:00");
  console.log(moment().format("YYYY:MM:DD hh:mm:ss"));
  console.log(moment().year());
  var year;
  var sql;
  if (!req.query.year) {
    // year = '202'
    // year = moment().year();
    sql = `SELECT * FROM resource_map`;
  } else {
    year = req.query.year;
    sql = `SELECT * FROM resource_map where YEAR(created_date) ='${year}'`;
  }

  // var extened = `where YEAR(created_date) ='${year}'`
  db.query(
    sql,

    function (error, results, fields) {
      if (error) throw error;
      let sumEnergy = [0, 0, 0],
        sumCO2rq = [0, 0, 0],
        tonneCO2 = [0, 0, 0];
      let data = [];
      for (let i = 0; i < results.length; i++) {
        // console.log(JSON.parse(results[i]['raw']))
        try {
          results[i]["raw"] = JSON.parse(results[i]["raw"]);
          for (const [key1, value1] of Object.entries(results[i]["raw"])) {
            for (const [key2, value2] of Object.entries(
              results[i]["raw"][key1]
            )) {
              let index = null;
              switch (key1) {
                case "zone_1":
                  index = 0;
                  break;
                case "zone_2":
                  index = 1;
                  break;
                case "zone_3":
                  index = 2;
                  break;
                default:
                  break;
              }

              if (index == null) continue;

              if (value2.amount_of_energy) {
                sumEnergy[index] += Number(value2.amount_of_energy);
              }
              if (value2.kgCO2_eq) {
                sumCO2rq[index] += Number(value2.kgCO2_eq);
              }
              if (value2.tonene_CO2) {
                tonneCO2[index] += Number(value2.tonene_CO2);
              }
            }
          }
          // console.log('results-->',results[i]["raw"])
          data = {
            KgCO2: sumCO2rq,
            tonene: tonneCO2,
          };
        } catch (error) {}
      }
      return res.send({
        error: false,
        success: results.length == 0 ? false : true,
        data: data,
        message: "Fetch Successfully.",
      });
    }
  );
});

router.get("/resource/report/zone", (req, res, next) => {
  // if (
  //   !req.headers.authorization ||
  //   !req.headers.authorization.startsWith("Bearer") ||
  //   !req.headers.authorization.split(" ")[1]
  // ) {
  //   return res.status(422).json({
  //     message: "Please provide the token",
  //   });
  // }
  // const theToken = req.headers.authorization.split(" ")[1];
  // const decoded = jwt.verify(theToken, "the-super-strong-secrect");

  moment().utcOffset("+07:00");
  console.log(moment().format("YYYY:MM:DD hh:mm:ss"));
  console.log(moment().year());
  var year;
  var sql;
  // var zone
  // req.query.zone
  // if(req.query.zone == "1"){
  var zone = `zone_${req.query.zone}`;
  // }
  if (!req.query.year) {
    // year = '202'
    // year = moment().year();
    sql = `SELECT * FROM resource_map`;
  } else {
    year = req.query.year;
    sql = `SELECT * FROM resource_map where YEAR(created_date) ='${year}'`;
  }

  // var extened = `where YEAR(created_date) ='${year}'`
  db.query(
    sql,

    function (error, results, fields) {
      if (error) throw error;
      // let sumEnergy = [0, 0, 0],
      //   sumCO2rq = [0, 0, 0],
      //   tonneCO2 = [0, 0, 0]
      let data = {};
      if (results.length == 0) data = [];
      for (let i = 0; i < results.length; i++) {
        try {
          results[i]["raw"] = JSON.parse(results[i]["raw"]);
          for (const [key1, value1] of Object.entries(results[i]["raw"])) {
            if (key1 !== zone) continue;
            data[key1] = data[key1] || {};
            for (const [key2, value2] of Object.entries(
              results[i]["raw"][key1]
            )) {
              data[key1][key2] = value2;
              if (value2.kgCO2_eq == "") value2.kgCO2_eq = 0;
              if (value2.tonene_CO2 == "") value2.tonene_CO2 = 0;
              if (value2.amount_of_energy == "") value2.amount_of_energy = 0;
            }
          }
        } catch (error) {}
      }

      return res.send({
        error: false,
        success: results.length == 0 ? false : true,
        data: data,
        message: "Fetch Successfully.",
      });
    }
  );
});

router.get("/resource/report/summary", (req, res, next) => {
  // if (
  //   !req.headers.authorization ||
  //   !req.headers.authorization.startsWith("Bearer") ||
  //   !req.headers.authorization.split(" ")[1]
  // ) {
  //   return res.status(422).json({
  //     message: "Please provide the token",
  //   });
  // }
  // const theToken = req.headers.authorization.split(" ")[1];
  // const decoded = jwt.verify(theToken, "the-super-strong-secrect");

  moment().utcOffset("+07:00");
  console.log(moment().format("YYYY:MM:DD hh:mm:ss"));
  console.log(moment().year());
  var year;
  var sql;
  if (!req.query.year) {
    // year = '202'
    // year = moment().year();
    sql = `SELECT * FROM resource_map where created_date BETWEEN DATE_SUB(NOW(), INTERVAL 3 YEAR) AND NOW()`;
  } else {
    year = req.query.year;
    sql = `SELECT * FROM resource_map where created_date BETWEEN DATE_SUB(NOW(), INTERVAL ${year} YEAR) AND NOW()`;
  }

  // var extened = `where YEAR(created_date) ='${year}'`
  db.query(
    sql,

    function (error, results, fields) {
      if (error) throw error;
      //       const data = {};

      // for (let i = 0; i < results.length; i++) {
      //   let date = new Date(results[i]["created_date"]);
      //   let year = date.getFullYear();
      //   let sumKgCO2 = 0;
      //   let sumTonene_CO2 = 0;
      //   let sumAmount_of_energy = 0;
      //   data[year] = data[year] || {};

      //   try {
      //     let rawData = JSON.parse(results[i]["raw"]);
      //     for (const [key1, value1] of Object.entries(rawData)) {
      //       console.log(rawData)
      //       data[year][key1] = data[year][key1] || {
      //         KgCO2: 0,
      //         tonene: 0,
      //         amount_of_energy:0
      //       };

      //       for (const [key2, value2] of Object.entries(rawData[key1])) {
      //         console.log(value2)
      //         if (value2.amount_of_energy) {
      //           data[year][key1]["amount_of_energy"] += Number(value2.amount_of_energy);
      //         }
      //         if (value2.kgCO2_eq) {
      //           data[year][key1]["KgCO2"] += Number(value2.kgCO2_eq);
      //         }
      //         if (value2.tonene_CO2) {
      //           data[year][key1]["tonene"] += Number(value2.tonene_CO2);
      //         }
      //       }
      //     }
      //   } catch (error) {}
      const data = {};
      const sums = {};

      for (let i = 0; i < results.length; i++) {
        let date = new Date(results[i]["created_date"]);
        let year = date.getFullYear();
        sums[year] = sums[year] || {
          KgCO2: 0,
          tonene: 0,
          amount_of_energy: 0,
        };
        data[year] = data[year] || {};

        try {
          let rawData = JSON.parse(results[i]["raw"]);
          for (const [key1, value1] of Object.entries(rawData)) {
            console.log(rawData);
            data[year][key1] = data[year][key1] || {
              KgCO2: 0,
              tonene: 0,
              amount_of_energy: 0,
            };

            for (const [key2, value2] of Object.entries(rawData[key1])) {
              console.log(value2);
              if (value2.amount_of_energy) {
                data[year][key1]["amount_of_energy"] += Number(
                  value2.amount_of_energy
                );
                sums[year]["amount_of_energy"] += Number(
                  value2.amount_of_energy
                );
              }
              if (value2.kgCO2_eq) {
                data[year][key1]["KgCO2"] += Number(value2.kgCO2_eq);
                sums[year]["KgCO2"] += Number(value2.kgCO2_eq);
              }
              if (value2.tonene_CO2) {
                data[year][key1]["tonene"] += Number(value2.tonene_CO2);
                sums[year]["tonene"] += Number(value2.tonene_CO2);
              }
            }
          }
        } catch (error) {}
        data[year] = sums[year];
      }
      return res.send({
        error: false,
        success: results.length == 0 ? false : true,
        data: data,
        message: "Fetch Successfully.",
      });
    }
  );
});

router.get("/resource/data", (req, res, next) => {
  req.query.id;
  // if (
  //   !req.headers.authorization ||
  //   !req.headers.authorization.startsWith("Bearer") ||
  //   !req.headers.authorization.split(" ")[1]
  // ) {
  //   return res.status(422).json({
  //     message: "Please provide the token",
  //   });
  // }
  // const theToken = req.headers.authorization.split(" ")[1];
  // const decoded = jwt.verify(theToken, "the-super-strong-secrect");
  moment().utcOffset("+07:00");
  console.log(moment().format("YYYY:MM:DD hh:mm:ss"));

  db.query(
    `SELECT * FROM resource_map  where id ='${req.query.id}'`,

    function (error, results, fields) {
      if (error) throw error;

      for (let i = 0; i < results.length; i++) {
        // console.log(JSON.parse(results[i]['raw']))
        try {
          results[i]["raw"] = JSON.parse(results[i]["raw"]);
        } catch (error) {}
      }
      return res.send({
        error: false,
        success: results.length == 0 ? false : true,
        data: results,
        message: "Fetch Successfully.",
      });
    }
  );
});
///----------------------------------------------------------------------------------------////
router.post("/resource", (req, res, next) => {
  const data = JSON.stringify(req.body.data);

  var success = true;
  moment().utcOffset("+07:00");
  let date = moment().format("YYYY:MM:DD hh:mm:ss");
  // Array.from(req.body.data).forEach(data => {
  // console.log(data)
  db.query(
    `INSERT INTO resource_map ( raw,created_date, modified_date) VALUES (
        '${data}',    
          '${date}',
              '${date}')`,
    (err, result) => {
      if (result) {
        // return res.status(200).send({
        //   msg: "seccess : true \n status API server 500 is ready!!",
        // });
      } else {
        // username is available
        success = false;
        // return res.status(500).send({
        //   msg: err,
        // });
      }
    }
  );
  // });
  if (success) {
    return res.status(200).send({
      msg: "seccess : true \n status API server 500 is ready!!",
    });
  }
});

///----------------------------------------------------------------------------------------////
router.put("/resource", (req, res, next) => {
  // console.log(req.body)
  // console.log(req.body.data.length)
  const data = JSON.stringify(req.body.data);
  console.log("asdasdad");
  var success = true;
  moment().utcOffset("+07:00");
  let date = moment().format("YYYY:MM:DD hh:mm:ss");
  // Array.from(req.body.data).forEach(data => {
  // console.log(data)
  // console.log(date)
  // console.log(req.query.id)
  // console.log(data)
  db.query(
    `update resource_map SET raw ='${data}',   modified_date ='${date}' where id = '${req.query.id}'`,
    (err, result) => {
      if (result) {
        // return res.status(200).send({
        //   msg: "seccess : true \n status API server 500 is ready!!",
        // });
      } else {
        // username is available
        success = false;
        // return res.status(500).send({
        //   msg: err,
        // });
      }
    }
  );
  // });
  if (success) {
    return res.status(200).send({
      msg: "seccess : true \n status API server 500 is ready!!",
    });
  }
});

///----------------------------------------------------------------------------------------////
router.delete("/resource", (req, res, next) => {
  // console.log(req.body)
  // console.log(req.body.data.length)
  console.log(req.query.id);
  var success = true;
  // Array.from(req.body.data).forEach(data => {
  // console.log(data)
  db.query(
    `delete FROM resource_map where id ='${req.query.id}'`,
    (err, result) => {
      if (result) {
        // return res.status(200).send({
        //   msg: "seccess : true \n status API server 500 is ready!!",
        // });
      } else {
        // username is available
        success = false;
        // return res.status(500).send({
        //   msg: err,
        // });
      }
    }
  );
  // });
  if (success) {
    return res.status(200).send({
      msg: "seccess : true \n status API server 500 is ready!!",
    });
  }
});

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
router.get("/list-resource-year", (req, res, next) => {
  var year = req.query.year;
  // if (
  //   !req.headers.authorization ||
  //   !req.headers.authorization.startsWith("Bearer") ||
  //   !req.headers.authorization.split(" ")[1]
  // ) {
  //   return res.status(422).json({
  //     message: "Please provide the token",
  //   });
  // }
  // const theToken = req.headers.authorization.split(" ")[1];
  // const decoded = jwt.verify(theToken, "the-super-strong-secrect");
  db.query(
    `SELECT zone,sum(KgCO2_eq) as total_KgCO2_eq,sum(tonene_CO2)as total_tonene_CO2 FROM resource_data WHERE YEAR(created_at) = '${year}' GROUP BY zone;`,

    function (error, results, fields) {
      if (error) throw error;
      return res.send({
        error: false,
        data: results,
        message: "Fetch Successfully.",
      });
    }
  );
});

router.get("/list-resource-zone", (req, res, next) => {
  var zone = req.query.zone;
  // if (
  //   !req.headers.authorization ||
  //   !req.headers.authorization.startsWith("Bearer") ||
  //   !req.headers.authorization.split(" ")[1]
  // ) {
  //   return res.status(422).json({
  //     message: "Please provide the token",
  //   });
  // }
  // const theToken = req.headers.authorization.split(" ")[1];
  // const decoded = jwt.verify(theToken, "the-super-strong-secrect");
  db.query(
    `SELECT * FROM resource_data WHERE zone = '${zone}';`,

    function (error, results, fields) {
      if (error) throw error;
      return res.send({
        error: false,
        data: results,
        message: "Fetch Successfully.",
      });
    }
  );
});

router.get("/list-resource-3year", (req, res, next) => {
  db.query(
    `SELECT YEAR(created_at) as year, sum(KgCO2_eq) as total_KgCO2_eq, sum(tonene_CO2) as total_tonene_CO2
    FROM resource_data
    WHERE created_at BETWEEN DATE_SUB(NOW(), INTERVAL 3 YEAR) AND NOW()
    GROUP BY YEAR(created_at);`,

    function (error, results, fields) {
      if (error) throw error;
      return res.send({
        error: false,
        data: results,
        message: "Fetch Successfully.",
      });
    }
  );
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
  const { category_id, name } = req.query;

  let query = `SELECT p.*, c.name AS category_name
  FROM products p
  JOIN product_categories c ON p.category_id = c.id`;
  let params = [];
  if (category_id != null && name != null) {
    query += " WHERE category_id = ? AND name LIKE ?";
    params = [category_id, `%${name}%`];
  } else if (category_id != null) {
    query += " WHERE category_id = ?";
    params = [category_id];
  } else if (name != null) {
    query += " WHERE name LIKE ?";
    params = [`%${name}%`];
  }

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
        message: "Fetch Successfully.",
      });
    }
  });
});
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

  db.query(
    `DELETE FROM products WHERE id = '${id}'`,
    (err, result) => {
      if (result && result.affectedRows > 0) { // <-- Check if at least one row was deleted
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
    }
  );
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
