require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user");
const RestaurantModel = require("../models/restaurants");

const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS);
const SECRET_KEY = process.env.SECRET_KEY;
const MAX_AGE = 24 * 60 * 60;

mongoose.Promise = global.Promise;

const initialize = async () => {
  try {
    await mongoose.connect(DB_CONNECTION_STRING);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1); // Exit the process if MongoDB connection fails
  }
};

const createToken = (id) =>
  jwt.sign({ id }, SECRET_KEY, { expiresIn: MAX_AGE });

const createUser = async ({ username, password }) => {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return await UserModel.create({ username, password: hashedPassword });
  } catch (error) {
    console.error("Error creating new user:", error.message);
    throw error;
  }
};

const loginUser = async (username, password) => {
  try {
    const user = await UserModel.findOne({ username });
    if (!user) throw new Error("No user exists with this username!!");
    const auth = await bcrypt.compare(password, user.password);
    if (!auth)
      throw new Error("Incorrect password for this username. Try again.");
    return user;
  } catch (error) {
    console.error("Error logging in user:", error.message);
    throw error;
  }
};

const addNewRestaurant = async (data) => {
  try {
    return await RestaurantModel.create(data);
  } catch (error) {
    console.error("Error adding new restaurant:", error.message);
    throw error;
  }
};

const getAllRestaurants = async (page, perPage, borough) => {
  try {
    const optionalBorough = borough ? { borough } : {};
    return await RestaurantModel.find(optionalBorough)
      .sort({ restaurant_id: 1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean();
  } catch (error) {
    console.error("Error getting restaurants:", error.message);
    throw error;
  }
};

const getRestaurantById = async (Id) => {
  try {
    return await RestaurantModel.findById(Id);
  } catch (error) {
    console.error("Error getting restaurant by Id:", error.message);
    throw error;
  }
};

const updateRestaurantById = async (Id, data) => {
  try {
    return await RestaurantModel.findByIdAndUpdate(Id, data, { new: true });
  } catch (error) {
    console.error("Error updating restaurant by Id:", error.message);
    throw error;
  }
};

const deleteRestaurantById = async (Id) => {
  try {
    return await RestaurantModel.findOneAndDelete({ _id: Id });
  } catch (error) {
    console.error("Error deleting restaurant by Id:", error.message);
    throw error;
  }
};

const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(token, SECRET_KEY, (error, decodedToken) => {
      if (error) {
        console.log(error.message);
        res.redirect("/login");
      } else {
        console.log(decodedToken);
        next();
      }
    });
  } else {
    res.redirect("/login");
  }
};

const checkUser = (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(token, SECRET_KEY, async (err, decodedToken) => {
      if (err) {
        res.locals.user = null;
        next();
      } else {
        const currentUser = await UserModel.findById(decodedToken.id).lean();
        res.locals.user = currentUser;
        next();
      }
    });
  } else {
    res.locals.user = null;
    next();
  }
};

module.exports = {
  initialize,
  addNewRestaurant,
  getAllRestaurants,
  getRestaurantById,
  updateRestaurantById,
  deleteRestaurantById,
  createUser,
  createToken,
  MAX_AGE,
  loginUser,
  requireAuth,
  checkUser,
};
