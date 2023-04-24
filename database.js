var mysql = require('mysql');
require('dotenv').config()


var conn = mysql.createConnection({
  // host: process.env.IP, // Replace with your host name
  // user: process.env.USERNAME,      // Replace with your database username
  // password: process.env.PASSWORD,      // Replace with your database password
  // database: process.env.DB // // Replace with your database Name
  host:'localhost', // Replace with your host name
  user: 'root',      // Replace with your database username
  password: '',      // Replace with your database password
  database: 'onlineshoppingco2' // // Replace with your database Name
  // database: 'resource_information' // // Replace with your database Name
}); 
 
 
conn.connect(function(err) {
  if (err) throw err;
  console.log('Database is connected successfully !');
});
module.exports = conn;