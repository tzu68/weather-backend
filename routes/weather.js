const express = require("express");
const router = express.Router();
const weatherController = require("../controllers/weatherController");

// 動態取得城市天氣預報
router.get("/:city", weatherController.getWeatherByCity);

module.exports = router;
