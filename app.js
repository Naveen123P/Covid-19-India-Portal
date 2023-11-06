const express = require("express");
const app = express();
app.use(express.json());
module.exports = app;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
const initilizeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server is running at http://localhost:3000/")
    );
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initilizeDBAndServer();

const Authentication = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "jhgcjhgydgjfcjhhjcj", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// API 1

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuary = `
    SELECT * FROM user WHERE username = '${username}';
    `;
  const dbUser = await db.get(getUserQuary);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatch = await bcrypt.compare(password, dbUser.password);
    const payload = { username: username };
    if (isPasswordMatch) {
      const jwtToken = jwt.sign(payload, "jhgcjhgydgjfcjhhjcj");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// API 2

app.get("/states/", Authentication, async (request, response) => {
  const getStatesQuary = `
    SELECT 
        state_id as stateId,
        state_name as stateName,
        population as population
    FROM 
        state 
    ORDER BY state_id ;
    `;
  const statesDetails = await db.all(getStatesQuary);
  response.send(statesDetails);
});

// API 3

app.get("/states/:stateId/", Authentication, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuary = `
    SELECT 
        state_id as stateId,
        state_name as stateName,
        population as population
    FROM
         state 
    WHERE 
        state_id = ${stateId} ; 
    `;
  const stateDetails = await db.get(getStateQuary);
  response.send(stateDetails);
});

// API 4

app.post("/districts/", Authentication, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDistDetQuery = `
    INSERT INTO 
        district(district_name, state_id, cases, cured, active, deaths)
    VALUES(
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    )
    `;
  const postedDistDet = await db.run(postDistDetQuery);
  response.send("District Successfully Added");
});

// API 5

app.get(
  "/districts/:districtId/",
  Authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuary = `
    SELECT 
        district_id as districtId,
        district_name AS districtName,
        state_id AS stateId,
        cases,
        cured,
        active,
        deaths
    FROM 
        district 
    WHERE 
        district_id = ${districtId};
    `;
    const districtDetails = await db.get(getDistrictQuary);
    response.send(districtDetails);
  }
);

// API 6

app.delete(
  "/districts/:districtId/",
  Authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuary = `
    DELETE FROM district WHERE district_id = ${districtId};
    `;
    const deleteDistrictTable = await db.run(deleteDistrictQuary);
    response.send("District Removed");
  }
);

// API 7

app.put(
  "/districts/:districtId/",
  Authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateDistrictQuery = `
    UPDATE 
        district
    SET
        district_name = '${districtName}',
        state_id = ${stateId},
        cases = ${cases}, 
        cured = ${cured},
        active = ${active},
        deaths = ${deaths}
    WHERE
        district_id = ${districtId};
    `;
    const updatedDistrict = await db.run(updateDistrictQuery);
    response.send("District Details Updated");
  }
);

//API 8

app.get(
  "/states/:stateId/stats/",
  Authentication,
  async (request, response) => {
    const { stateId } = request.params;
    const stateStatsQuary = `
    SELECT
        SUM(cases) as totalCases,
        SUM(cured) as totalCured,
        SUM(active) as totalActive,
        SUM(deaths) As totalDeaths
    FROM
        district
    WHERE
        state_id = ${stateId}
    `;
    const stateStats = await db.get(stateStatsQuary);
    response.send(stateStats);
  }
);
