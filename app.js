require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");
const { body, param, query, validationResult } = require("express-validator");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
const database = require("./config/database");
const port = process.env.PORT;

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

database
  .initialize()
  .then(() => {
    const hbs = exphbs.create({ extname: ".hbs" });
    app.engine(".hbs", hbs.engine);
    app.set("view engine", ".hbs");

    app.get("*", database.checkUser);
    app.post("*", database.checkUser);

    app.get("/", (req, res) => res.render("home"));

    app.get("/signup", (req, res) => res.render("signup.hbs"));
    app.post(
      "/signup",
      [
        body("username")
          .isLength({ min: 8 })
          .isString()
          .withMessage("Username must be a string of 8 characters."),
        body("password")
          .isLength({ min: 8 })
          .withMessage("Password must be at least 8 characters"),
      ],
      async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).render("error", {
            message: "Validation error",
            errors: errors.array(),
          });
        }
        try {
          const { username, password } = req.body;
          const user = await database.createUser({ username, password });
          if (user) {
            const token = database.createToken(user._id);
            res.cookie("jwt", token, {
              httpOnly: true,
              maxAge: database.maxAge * 1000,
            });
            res.redirect("/");
          }
        } catch (error) {
          console.log(error);
          if (
            error.code === 11000 &&
            error.keyPattern &&
            error.keyPattern.username === 1
          ) {
            res.status(400).render("error", {
              message: "This username is already taken!! Try a different one!",
            });
          } else {
            res.status(400).render("error", {
              message: "Database related error! User not created :(",
              errors: errors.array(),
            });
          }
        }
      }
    );

    app.get("/login", (req, res) => res.render("login.hbs"));
    app.post(
      "/login",
      [
        body("username")
          .isLength({ min: 8 })
          .isString()
          .withMessage("Username must be a string of 8 characters."),
        body("password")
          .isLength({ min: 8 })
          .withMessage("Password must be at least 8 characters"),
      ],
      async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).render("error", {
            message: "Validation error",
            errors: errors.array(),
          });
        }
        try {
          const { username, password } = req.body;
          const user = await database.loginUser(username, password);
          const token = database.createToken(user._id);
          res.cookie("jwt", token, {
            httpOnly: true,
            maxAge: database.maxAge * 1000,
          });
          res.redirect("/");
        } catch (error) {
          console.log(error);
          if (
            error.code === 11000 &&
            error.keyPattern &&
            error.keyPattern.username === 1
          ) {
            res.status(400).render("error", {
              message: "This username is already taken!! Try a different one!",
            });
          } else {
            res.status(400).render("error", {
              message: "Login Authentication error! :(  " + error,
              errors: errors.array(),
            });
          }
        }
      }
    );

    app.get("/logout", (req, res) => {
      res.cookie("jwt", "", { maxAge: 1 });
      res.redirect("/api/restrauntForm");
    });

    app.get("/api/restrauntForm", (req, res) => res.render("form.hbs"));
    app.post(
      "/api/restrauntForm",
      database.requireAuth,
      [
        body("page").isNumeric().withMessage("Page must be a number"),
        body("perPage").isNumeric().withMessage("PerPage must be a number"),
        body("borough")
          .optional()
          .isString()
          .withMessage("Borough must be a string"),
      ],
      async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).render("error", {
            message: "Validation error",
            errors: errors.array(),
          });
        }
        try {
          const { page, perPage } = req.body;
          const borough = req.body.borough;

          const restro = await database.getAllRestaurants(
            page,
            perPage,
            borough
          );
          if (restro.length === 0) {
            return res.status(404).render("error", {
              message: "No restaurants found for the specified borough",
            });
          }
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

    app.post("/api/restaurants", database.requireAuth, async (req, res) => {
      try {
        if (
          !req.body.name ||
          !req.body.cuisine ||
          !req.body.borough ||
          !req.body.restaurant_id
        ) {
          return res.status(400).json({
            error:
              "Name,restaurant_id, cuisine, and borough are required fields.",
          });
        }
        const restaurant = await database.addNewRestaurant(req.body);
        res
          .status(201)
          .json({ message: "Restaurant added successfully!", restaurant });
      } catch (error) {
        console.error("Error adding new restaurant:", error.message);
        res.status(500).send("Internal Server Error");
      }
    });

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
        try {
          const { page, perPage, borough } = req.query;
          const restro = await database.getAllRestaurants(
            page,
            perPage,
            borough
          );
          if (restro.length === 0) {
            return res.status(404).json({
              message: "No restaurants found for the specified borough",
            });
          }
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
          return res.status(400).json({
            message: "Validation failed.",
            errors: validationErrors.array(),
          });
        }
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

    app.put("/api/restaurants/:id", database.requireAuth, async (req, res) => {
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

    app.delete(
      "/api/restaurants/:id",
      database.requireAuth,
      async (req, res) => {
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
      }
    );

    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Error initializing app:", error.message);
    process.exit(1);
  });
