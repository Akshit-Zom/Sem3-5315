require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const appConfig = require("./package.json");

const app = express();
const database = require("./config/database");
const bodyParser = require("body-parser"); // pull information from HTML POST (express4)

const port = process.env.PORT || 3000;
app.use(bodyParser.urlencoded({ extended: true })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(bodyParser.json({ type: "application/vnd.api+json" })); // parse application/vnd.api+json as json
const { param, query, validationResult } = require("express-validator"); //express-validator for checking input params in query for getting all restaurant details based on page, perPage and borough(optional)
// const Restaurant = require("./models/restaurants");

database
  .initialize()
  .then(() => {
    // Route to add a new restaurant
    app.post("/api/restaurants", async (req, res) => {
      try {
        const restaurant = await database.addNewRestaurant(req.body);
        res
          .status(201)
          .json({ message: "Restaurant added successfully!", restaurant });
      } catch (error) {
        console.error("Error adding new restaurant:", error.message);
        res.status(500).send("Internal Server Error");
      }
    });

    //get all restaurant data from db based on page, perPage and borough(optional)
    app.get(
      "/api/restaurants",
      [
        query("page").isNumeric().toInt(),
        query("perPage").isNumeric().toInt(),
        query("borough").optional().isString(),
      ],
      async (req, res) => {
        const errorInput = validationResult(req);
        if (!errorInput.isEmpty()) {
          console.error("User input error. Please check the input provided.");
          return res.status(400).json({
            errors:
              "User input error. Please check the input provided." +
              errorInput.array(),
          });
        }
        // using function in database.js to get all employees in the database based on these params
        try {
          const { page, perPage, borough } = req.query;
          const restro = await database.getAllRestaurants(
            page,
            perPage,
            borough
          );
          console.log("Restaurant data retrieved.");
          res.status(200).json({
            message: "Successfully retrieved data from database.",
            data: restro,
          });
        } catch (reason) {
          console.error("Error getting all restaurants:", reason.message);
          res.status(500).json(reason);
        }
      }
    );

    //get all restaurant data from db based restaurant_id
    app.get(
      "/api/restaurants/:id",
      [
        param("id")
          .isMongoId()
          .withMessage("Invalid _id provided for restaurant."),
      ],
      async (req, res) => {
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
          return res
            .status(400)
            .json({ message: "Validation failed.", errors: errors.array() });
        }
        // use mongoose to get all employees in the database
        try {
          const restroId = req.params.id;
          const restro = await database.getRestaurantById(restroId);
          if (!restro) {
            return res
              .status(404)
              .json({ error: "Restaurant not found by this id." });
          }
          res.status(200).json({
            message:
              "Successfully retrieved restaurant details for the specific _id.",
            data: restro,
          });
        } catch (error) {
          console.error("Error getting the restaurant by Id:", error.message);
          res.status(500).json(error);
        }
      }
    );

    //update an existing restaurant info based on the id
    app.put("/api/restaurants/:id", async (req, res) => {
      try {
        const updatedRestro = await database.updateRestaurantById(
          req.params.id,
          req.body
        );
        if (!updatedRestro) {
          return res
            .status(404)
            .json({ error: "Restaurant not found by this id." });
        }
        console.log(
          "Successfully updated. Updated restaurant details: Name:" +
            updatedRestro.name +
            " | borough:" +
            updatedRestro.borough +
            " | restaurant_id:" +
            updatedRestro.restaurant_id
        );
        res.status(200).json({
          message: "Restaurant successfully updated.",
          data: updatedRestro,
        });
      } catch (error) {
        if (error instanceof mongoose.Error.CastError) {
          return res.status(400).json({
            error: "Invalid parameter type. The id must be a valid ObjectId.",
          });
        }
        console.error(
          "Error updating the restaurant by this Id and parameters sent.",
          error.message
        );
        res.status(500).json({
          error: "Internal Server Error.",
          message:
            "Error updating the restaurant by this Id and parameters sent.",
        });
      }
    });

    //deletion of an existing restaurant based on _id as route parameter
    app.delete("/api/restaurants/:id", async (req, res) => {
      console.log(req.params.id);
      try {
        const restroId = req.params.id;
        const restroDeleted = await database.deleteRestaurantById(restroId);
        if (restroDeleted) {
          console.log("Successfully deleted.");
          return res
            .status(200)
            .json({ message: "Restaurant successfully deleted." });
        } else {
          return res
            .status(404)
            .json({ error: "Restaurant not found by this id." });
        }
      } catch (error) {
        if (error instanceof mongoose.Error.CastError) {
          return res.status(400).json({
            error: "Invalid parameter type. The id must be a valid ObjectId.",
          });
        }
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.listen(port, () => {
      console.log(`${appConfig.name} listening on port: ${port}`);
    });
  })
  .catch((error) => {
    console.error("Error initializing app:", error.message);
    process.exit(1); // Exit the process if initialization fails
  });
