// var mysql = require('mysql2');

require('dotenv').config()

// var conn = mysql.createConnection({
//   host: process.env.IP, // Replace with your host name
//   user: process.env.USERNAME,      // Replace with your database username
//   password: process.env.PASSWORD,      // Replace with your database password
//   database: process.env.DB // // Replace with your database Name
// }); 
 
 
// conn.connect(function(err) {
//   if (err) throw err;
//   console.log('Database is connected successfully !');
// });
// module.exports = conn;

module.exports = function () {

  let mysql = require('mysql2')

  //Establish Connection to the DB
  let connection = mysql.createConnection({
    host: process.env.IP, // Replace with your host name
    user: process.env.USERNAME,      // Replace with your database username
    password: process.env.PASSWORD,      // Replace with your database password
    database: process.env.DB // // Replace with your database Name
  });

  //Instantiate the connection
  connection.connect(function (err) {
      if (err) {
          console.log(`connectionRequest Failed ${err.stack}`)
      } else {
          console.log(`DB connectionRequest Successful ${connection.threadId}`)
      }
  });

  //return connection object
  return connection
}