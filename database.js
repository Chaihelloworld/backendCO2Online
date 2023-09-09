var mysql = require('mysql2');
require('dotenv').config()


var conn = mysql.createConnection({
  host: process.env.IP, // Replace with your host name
  user: process.env.USERNAME,      // Replace with your database username
  password: process.env.PASSWORD,      // Replace with your database password
  database: process.env.DB // // Replace with your database Name
  // host:'18.142.185.100', // Replace with your host name
  // user: 'chine',      // Replace with your database username
  // password: 'Gold26dg6pco*',      // Replace with your database password
  // database: 'onlineshoppingco2' // // Replace with your database Name
  // database: 'resource_information' // // Replace with your database Name
}); 
 
 
conn.connect(function(err) {
  if (err) throw err;
  console.log('Database is connected successfully !');
});
module.exports = conn;