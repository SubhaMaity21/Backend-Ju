import { ensureDirectoriesExist } from "./utils/fileSystem.js";
import express, { urlencoded } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
ensureDirectoriesExist();
const app = express()
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({
    limit:"16kb"
}))
app.use(urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes import

import userRoutes from "./routes/user.routes.js";
import diseaseRoutes from "./routes/disease.route.js";

// routes declaration
app.use("/api/v1/users",userRoutes)
app.use("/api/v1/crops",diseaseRoutes)


export {app};