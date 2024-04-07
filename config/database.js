const mongoose = require("mongoose");
const Restaurant = require("../models/restaurants");

const initialize = async () => {
  try {
    const url = process.env.DB_CONNECTION_STRING;
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1); // Exit the process if MongoDB connection fails
  }
};

const addNewRestaurant = async (data) => {
  try {
    const restaurant = new Restaurant(data);
    await restaurant.save();
    return restaurant;
  } catch (error) {
    console.error("Error adding new restaurant:", error.message);
    throw error;
  }
};

const getAllRestaurants = async (page, perPage, borough) => {
  try {
    const optionalBorough = borough ? { borough } : {};
    const restro = await Restaurant.find(optionalBorough)
      .sort({ restaurant_id: 1 })
      .skip((page - 1) * perPage)
      .limit(perPage);
    return restro;
  } catch (error) {
    console.error(
      "Error getting restaurant information based on these parameters:",
      error.message
    );
    throw error;
  }
};

const getRestaurantById = async (Id) => {
  try {
    const restro = await Restaurant.findById(Id);
    return restro;
  } catch (error) {
    console.error(
      "Error getting restaurant information based on this Id:",
      error.message
    );
    throw error;
  }
};

const updateRestaurantById = async (Id, data) => {
  try {
    const restro = await Restaurant.findByIdAndUpdate(Id, data, { new: true });
    return restro;
  } catch (error) {
    console.error("Error updating the restaurant information:", error.message);
    throw error;
  }
};

const deleteRestaurantById = async (Id) => {
  try {
    const restroDeleted = await Restaurant.findOneAndDelete({ _id: Id });
    return restroDeleted;
  } catch (error) {
    console.error("Error deleting the restaurant information:", error.message);
    throw error;
  }
};

module.exports = {
  initialize,
  addNewRestaurant,
  getAllRestaurants,
  getRestaurantById,
  updateRestaurantById,
  deleteRestaurantById,
};
