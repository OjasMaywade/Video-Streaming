import connectDB from "./db/db.js";
import app from "./app.js"


connectDB()
.then(()=>{
app.listen(process.env.PORT || 4000, ()=>{
    console.log(`Server running on PORT: ${process.env.PORT}`);
})
})
.catch((err)=>{
    console.log("Failed to run server", err);
})

