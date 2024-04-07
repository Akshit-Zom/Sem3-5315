// Import required modules
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const exphbs = require("express-handlebars");
const bodyParser = require("body-parser");
const { body, param, query, validationResult } = require("express-validator");
const path = require("path");

// Initialize Express app
const app = express();
const port = process.env.PORT || 8000;

// Connect to MongoDB database
const database = require("./config/database");
database
  .initialize()
  .then(() => {
    console.log("Connected to MongoDB.");

    // Set up view engine
    app.engine(".hbs", exphbs({ extname: ".hbs" }));
    app.set("view engine", ".hbs");

    // Middleware for parsing incoming requests
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, "public")));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(bodyParser.json({ type: "application/vnd.api+json" }));

    // Route to render form for user to enter page, perPage, and borough
    app.get("/api/restrauntForm", (req, res) => {
      res.render("form.hbs");
    });

    // Route to handle form submission
    app.post(
      "/api/restrauntForm",
      [
        body("page").isNumeric().withMessage("Page must be a number"),
        body("perPage").isNumeric().withMessage("PerPage must be a number"),
        body("borough")
          .optional()
          .isString()
          .withMessage("Borough must be a string"),
      ],
      async (req, res) => {
        // Validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).render("error", {
            message: "Validation error",
            errors: errors.array(),
          });
        }
        try {
          // Get input parameters
          const { page, perPage, borough } = req.body;
          // Retrieve data from database based on input parameters
          const restro = await database.getAllRestaurants(
            page,
            perPage,
            borough
          );
          // Handle empty result
          if (restro.length === 0) {
            return res.status(404).render("error", {
              message: "No restaurants found for the specified borough",
            });
          }
          // Render restaurant display page with retrieved data
          res.status(200).render("output", {
            page,
            perPage,
            borough,
            restaurants: restro,
          });
        } catch (reason) {
          console.error("Error getting all restaurants:", reason.message);
          res.status(500).render("error", {
            message: "Database error",
            reason: reason.message,
          });
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
      console.log(`Server running on port: ${port}`);
    });
  })
  .catch((error) => {
    console.error("Error initializing app:", error.message);
    process.exit(1);
  });
