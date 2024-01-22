import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import cors from "cors";
import { log } from "console";

const port = 4000;
const app = express();

app.use(express.json());
app.use(cors());

// Database
mongoose.connect("mongodb+srv://root:Songjoongki26@perfume.b6n5rny.mongodb.net/lavrania");

// API
app.get("/", (error) => {
    res.send("Express App is Running");
});

// Image Storage
const storage = multer.diskStorage({
    destination: "./upload/images",
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    },
});

const upload = multer({ storage: storage });

// Creating upload endpoint
app.use('/images', express.static('upload/images'));

app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    });
});

// Schema
const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,  // Fixed syntax error here
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true,
    },
});

// Adding a product endpoint
app.post('/addprod', async (req, res) => {
    let products = await Product.find({});
    let id;
    if(products.length>0)
    {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    }
    else{
        id=1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success: true,
        name: req.body.name,
    });
});

//Creating API deleting

app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id }); // Fix typo 're' to 'req'
    console.log('Removed');
    res.json({
        success: true,
        name: req.body.name,
    });
});

//Creating API getting all products
app.get('/allproduct',async (req,res)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})
//Schema creating user model

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

//Creating Endpoint for register user
app.post('/signup', async (req, res) => {
    try {
        let check = await Users.findOne({ email: req.body.email });

        if (check!== null) {
            return res.status(400).json({ success: false, errors: "existing email address" });
        }

        let cart = {};
        for (let i = 0; i < 300; i++) {
            cart[i] = 0;
        }

        const user = new Users({
            name: req.body.username,
            email: req.body.email,
            password: req.body.password,
            cartData: cart,
        });

        await user.save();

        const data = {
            user: {
                id: user.id,
            }
        }

        const token = jwt.sign(data, 'secret_ecom');
        res.json({ success: true, token });
    } catch (error) {
        console.error('Error in signup endpoint:', error);
        res.status(500).json({ success: false, errors: "Internal Server Error" });
    }
});
//Creating endpoint user login
app.post('/login', async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false,error:"Wrong Password"});
        }
    }
    else{
        res.json({success:false,errors:"Wrong Email Id"})
    }
})
// Creating endpoint for Bon Vivant Classic
app.get('/classiccollections',async (req,res)=>{
    let products = await Product.find({category:"Bon Vivant Classic"});
    let classiccollection = products.slice(1).slice(-8);
    console.log("Bon Vivant Classic Fetched");
    res.send(classiccollection);
})
//Creating endpoint for Bollinger Edition
app.get('/limitededition', async (req, res) => {
    let products = await Product.find({category:"Bollinger Edition"});
    let limited_edition = products.slice(0,8);
    console.log("Bollinger Edition Fetched");
    res.send(limited_edition);
})

//creating middleware to fetch user
const fetchUser = async (req,res,next)=>{
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({errors:"Please authenticate using valid token"})
    }
    else{
        try {
            const data = jwt.verify(token,'secret_ecom');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({error:"please authenticate using a valid token"})
        }
    }
}
//creating endpoint for adding products in cartdata
app.post('/addtocart', fetchUser, async (req, res) => {

    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] +=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added")
})

app.listen(port, (error) => {
    if (!error) {
        console.log("Server Running on Port" + port);
    } else {
        console.log("Error: " + error);
    }
});