const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler"); // try/ catch 대신 사용하기 위해
const adminLayout = "../views/layouts/admin" // 레이아웃 가져오기
const adminLayout2 = "../views/layouts/admin-nologout";
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Post = require("../models/Post");
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;

/**
 * Check Login
 */
const checkLogin = (req, res, next) => {
    const token = req.cookies.token; // 쿠키 정보 가져오기
    
    //토큰이 없다면
    if(!token) {
        res.redirect("/admin");
    }

    // 토큰이 있다면 토큰을 확인하고 사용자 정보를 요청에 추가하기
    try{
        const decoded = jwt.verify(token, jwtSecret); // 토큰 해석하기
        req.userId = decoded.userId;                 // 토큰의 사용자 ID를 요청에 추가하기
        next();
    }
    catch(error) {
        res.redirect("/admin");
    }
};

/**
 *  GET /admin
 *  Admin page
 */
router.get("/admin", (req, res) => {
    const locals = {
        title: "관리자 페이지", // 브라우저 탭에 표시할 내용
    };

    // adminLayout을 사용해서 admin/index.ejs 렌더링하기
    res.render("admin/index", { locals, layout: adminLayout2 })
});


/**
 * POST /admin
 * Check admin login
 */
router.post(
    "/admin",
    asyncHandler(async (req, res) => {
        const { username, password } = req.body;

        // 사용자 이름으로 사용자 찾기
        const user = await User.findOne({ username });
        // 일치하는 사용자가 없으면 401 오류 표시
        if(!user){
            return res.status(401).json({ message: "일치하는 사용자가 없습니다."});
        }
        //입력한 비밀번호와 DB에 저장된 비밀번호 비교
        const isValidPassword = await bcrypt.compare(password, user.password);
        //비밀번호가 일치하지 않으면 401 오류 표시
        if(!isValidPassword) {
            return res.status(401).json({ message: "비밀번호가 일치하지 않습니다."});
        }
        // JWT 토큰 생성
        const token = jwt.sign({ id: user._id }, jwtSecret);

        // 토큰을 쿠키에 저장
        res.cookie("token", token, { httpOnly: true });

        // 로그인에 성공하면 전체 게시물 목록 페이지로 이동
        res.redirect("/allPosts");
    })
);

/**
 *  GET /register
 *  Register administator
 */

router.get(
    "/register", asyncHandler(async (req, res) => {
        res.render("admin/index", { layout: adminLayout2 });
    })
);
/**
 * GET /allPosts
 * Get all posts
 */
router.get(
    "/allPosts",
    checkLogin,
    asyncHandler(async (req, res) => {
        const locals = {
            title: "전체 게시물",
        };
        const data = await Post.find().sort({ updatedAt: "desc", createAt: "desc" }); // 전체 게시물 가져오기
        res.render("admin/allPosts", { // locals값과 data 넘기기
            locals,
            data,
            layout: adminLayout,
        });
    })
);

/**
 * GET /logout
 * Admin logout
 */
router.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/");
});

/**
 * GET /add
 * Admin - Add Post
 */

router.get(
    "/add",
    checkLogin,
    asyncHandler(async (req, res) => {
        const locals = {
            title: "게시물 작성",
        };
        res.render("admin/add", {
            locals,
            layout: adminLayout,
        });
    })
);

/**
 * POST /add
 * Admin - Add Post
 */
router.post(
    "/add",
    checkLogin,
    asyncHandler(async (req, res) => {
        const { title, body } = req.body;

        const newPost = new Post({
            title: title,
            body: body,
        });

        await Post.create(newPost);

        res.redirect("/allPosts");
    })
);

/**
 *  GET /edit/:id
 *  Admin - Edit POST
 */
router.get("/edit/:id", checkLogin, asyncHandler(async (req, res) => {
    const locals = {
        title: "게시물 편집",
    };

    // id값을 사용해서 게시물 가져오기
    const data = await Post.findOne({_id: req.params.id });
    res.render("admin/edit", {
        locals,
        data,
        layout: adminLayout,
        });
    })
);
/**
 * PUT /edit/:id
 * Admin - Edit Post
 */
router.put("/edit/:id", checkLogin, asyncHandler(async (req, res) => {
    await Post.findByIdAndUpdate(req.params.id, {
        title: req.body.title,
        body: req.body.body,
        createdAt: Date.now(),
    });
    // 수정한 후 전체 목록 다시 표시하기
    res.redirect("/allPosts");
})
);

/**
 * DELETE /delete/:id
 * Admin - Delete Post
 */

router.delete("/delete/:id", checkLogin, asyncHandler(async (req, res) => {
    await Post.deleteOne({ _id: req.params.id });
    res.redirect("/allPosts");
})
);

module.exports = router;