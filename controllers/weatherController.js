const express = require("express");
const axios = require("axios");

// CWA API 設定
const CWA_API_BASE_URL = "https://opendata.cwa.gov.tw/api";
const CWA_API_KEY = process.env.CWA_API_KEY;

/**
 * 取得高雄天氣預報
 * CWA 氣象資料開放平臺 API
 * 使用「一般天氣預報-今明 36 小時天氣預報」資料集
 */
const getKaohsiungWeather = async (req, res) => {
  try {
    // 檢查是否有設定 API Key
    if (!CWA_API_KEY) {
      return res.status(500).json({
        error: "伺服器設定錯誤",
        message: "請在 .env 檔案中設定 CWA_API_KEY",
      });
    }

    // 呼叫 CWA API - 一般天氣預報（36小時）
    // API 文件: https://opendata.cwa.gov.tw/dist/opendata-swagger.html
    const response = await axios.get(
      `${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`,
      {
        params: {
          Authorization: CWA_API_KEY,
          locationName: "桃園市",
        },
      }
    );

    // 取得桃園市的天氣資料
    const locationData = response.data.records.location[0];

    if (!locationData) {
      return res.status(404).json({
        error: "查無資料",
        message: "無法取得桃園市天氣資料",
      });
    }

    // 整理天氣資料
    const weatherData = {
      city: locationData.locationName,
      updateTime: response.data.records.datasetDescription,
      forecasts: [],
    };

    // 解析天氣要素
    const weatherElements = locationData.weatherElement;
    const timeCount = weatherElements[0].time.length;

    for (let i = 0; i < timeCount; i++) {
      const forecast = {
        startTime: weatherElements[0].time[i].startTime,
        endTime: weatherElements[0].time[i].endTime,
        weather: "",
        rain: "",
        minTemp: "",
        maxTemp: "",
        comfort: "",
        windSpeed: "",
      };

      weatherElements.forEach((element) => {
        const value = element.time[i].parameter;
        switch (element.elementName) {
          case "Wx":
            forecast.weather = value.parameterName;
            break;
          case "PoP":
            forecast.rain = value.parameterName + "%";
            break;
          case "MinT":
            forecast.minTemp = value.parameterName + "°C";
            break;
          case "MaxT":
            forecast.maxTemp = value.parameterName + "°C";
            break;
          case "CI":
            forecast.comfort = value.parameterName;
            break;
          case "WS":
            forecast.windSpeed = value.parameterName;
            break;
        }
      });

      weatherData.forecasts.push(forecast);
    }

    res.json({
      success: true,
      data: weatherData,
    });
  } catch (error) {
    console.error("取得天氣資料失敗:", error.message);

    if (error.response) {
      // API 回應錯誤
      return res.status(error.response.status).json({
        error: "CWA API 錯誤",
        message: error.response.data.message || "無法取得天氣資料",
        details: error.response.data,
      });
    }

    // 其他錯誤
    res.status(500).json({
      error: "伺服器錯誤",
      message: "無法取得天氣資料，請稍後再試",
    });
  }
};

/**
 * 動態取得城市天氣預報
 * 支援多城市查詢
 */
// 前端協調好的縣市英文名稱對照
const cityMap = {
  taipei: "臺北市",
  Taipei: "臺北市",
  taoyuan: "桃園市",
  Taoyuan: "桃園市",
  taichung: "臺中市",
  Taichung: "臺中市",
  tainan: "臺南市",
  Tainan: "臺南市",
  kaohsiung: "高雄市",
  Kaohsiung: "高雄市",
  keelung: "基隆市",
  Keelung: "基隆市",
  hsinchu: "新竹市",
  Hsinchu: "新竹市",
  newtaipei: "新北市",
  NewTaipei: "新北市",
  hsinchucounty: "新竹縣",
  HsinchuCounty: "新竹縣",
  miaoli: "苗栗縣",
  Miaoli: "苗栗縣",
  changhua: "彰化縣",
  Changhua: "彰化縣",
  nantou: "南投縣",
  Nantou: "南投縣",
  yunlin: "雲林縣",
  Yunlin: "雲林縣",
  chiayi: "嘉義市",
  Chiayi: "嘉義市",
  chiayicounty: "嘉義縣",
  ChiayiCounty: "嘉義縣",
  pingtung: "屏東縣",
  Pingtung: "屏東縣",
  yilan: "宜蘭縣",
  Yilan: "宜蘭縣",
  hualien: "花蓮縣",
  Hualien: "花蓮縣",
  taitung: "臺東縣",
  Taitung: "臺東縣",
  penghu: "澎湖縣",
  Penghu: "澎湖縣",
  kinmen: "金門縣",
  Kinmen: "金門縣",
  lienchiang: "連江縣",
  Lienchiang: "連江縣",
};

const getWeatherByCity = async (req, res) => {
  try {
    if (!CWA_API_KEY) {
      return res.status(500).json({
        error: "伺服器設定錯誤",
        message: "請在 .env 檔案中設定 CWA_API_KEY",
      });
    }

    const cityParam = req.params.city.toLowerCase();
    const cwaCity = cityMap[cityParam];
    if (!cwaCity) {
      return res.status(400).json({ error: "不支援的城市" });
    }

    const response = await axios.get(
      `${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`,
      {
        params: {
          Authorization: CWA_API_KEY,
          locationName: cwaCity,
        },
      }
    );

    const locationData = response.data.records.location[0];
    if (!locationData) {
      return res.status(404).json({
        error: "查無資料",
        message: `無法取得${cwaCity}天氣資料`,
      });
    }

    const weatherData = {
      city: locationData.locationName,
      updateTime: response.data.records.datasetDescription,
      forecasts: [],
    };
    const weatherElements = locationData.weatherElement;
    const timeCount = weatherElements[0].time.length;
    for (let i = 0; i < timeCount; i++) {
      const forecast = {
        startTime: weatherElements[0].time[i].startTime,
        endTime: weatherElements[0].time[i].endTime,
        weather: "",
        rain: "",
        minTemp: "",
        maxTemp: "",
        comfort: "",
        windSpeed: "",
      };
      weatherElements.forEach((element) => {
        const value = element.time[i].parameter;
        switch (element.elementName) {
          case "Wx":
            forecast.weather = value.parameterName;
            break;
          case "PoP":
            forecast.rain = value.parameterName + "%";
            break;
          case "MinT":
            forecast.minTemp = value.parameterName + "°C";
            break;
          case "MaxT":
            forecast.maxTemp = value.parameterName + "°C";
            break;
          case "CI":
            forecast.comfort = value.parameterName;
            break;
          case "WS":
            forecast.windSpeed = value.parameterName;
            break;
        }
      });
      weatherData.forecasts.push(forecast);
    }
    res.json({ success: true, data: weatherData });
  } catch (error) {
    console.error("取得天氣資料失敗:", error.message);
    if (error.response) {
      return res.status(error.response.status).json({
        error: "CWA API 錯誤",
        message: error.response.data.message || "無法取得天氣資料",
        details: error.response.data,
      });
    }
    res.status(500).json({
      error: "伺服器錯誤",
      message: "無法取得天氣資料，請稍後再試",
    });
  }
};

module.exports = {
  getKaohsiungWeather,
  getWeatherByCity,
};
