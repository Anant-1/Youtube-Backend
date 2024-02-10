// require('dotenv').config({path:'./env'})
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "./.env",
});

connectDB()
    .then(() => {
        app.on("Connection establishment error with the app", (error) => {
            console.log("ERRR", error);
            throw error;
        });
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at port ${process.env.PORT}`);
        });
    })
    .catch((err) => [console.log(err)]);

// ;(async ()=>{

// })()
