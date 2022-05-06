const express = require("express");
const app = express();
const port = 5000;
const db = require("./conect/db");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const upload = require("./middleware/fileUpload");

app.set("view engine", "hbs"); // set view engine
app.use("/public", express.static(__dirname + "/public")); // set public path/folder
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.set("trust proxy", 1); // trust first proxy
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 2 * 60 * 60 * 1000 }, //2 jam
  })
);

app.get("/home", (req, res) => {
  if (req.session.isLogin) {
    db.connect(function (err, client) {
      if (err) throw err;

      client.query(
        `SELECT tb_project.id, tb_project.name, tb_user.name as author_id, tb_project.start_date, tb_project.end_date, 
        tb_project.description, tb_project.technologies, tb_project.image
          FROM public.tb_project LEFT JOIN tb_user ON tb_project.author_id = tb_user.id WHERE author_id = ${req.session.user.id}`,
        function (err, result) {
          if (err) throw err;

          let data = result.rows;
          data = data.map(function (data) {
            return {
              ...data,
              isLogin: req.session.isLogin,
              desc: data.description.slice(0, 50) + "....",
              duration: getDuration(data.start_date, data.end_date),
              vue: checkboxes(data.technologies[0]),
              react: checkboxes(data.technologies[1]),
              node: checkboxes(data.technologies[2]),
              java: checkboxes(data.technologies[3]),
            };
          });
          res.render("index", {
            blog: data,
            isLogin: req.session.isLogin,
            user: req.session.user,
          });
        }
      );
    });
  } else {
    db.connect(function (err, client) {
      if (err) throw err;

      client.query(
        `SELECT tb_project.id, tb_project.name, tb_user.name as author_id, tb_project.start_date, tb_project.end_date, 
        tb_project.description, tb_project.technologies, tb_project.image
          FROM public.tb_project LEFT JOIN tb_user ON tb_project.author_id = tb_user.id `,
        function (err, result) {
          if (err) throw err;

          let data = result.rows;
          data = data.map(function (data) {
            return {
              ...data,
              isLogin: req.session.isLogin,
              desc: data.description.slice(0, 50) + "....",
              duration: getDuration(data.start_date, data.end_date),
              vue: checkboxes(data.technologies[0]),
              react: checkboxes(data.technologies[1]),
              node: checkboxes(data.technologies[2]),
              java: checkboxes(data.technologies[3]),
            };
          });
          res.render("index", {
            blog: data,
            isLogin: req.session.isLogin,
            user: req.session.user,
          });
        }
      );
    });
  }
});

app.get("/contact", (req, res) => {
  if (!req.session.isLogin) {
    req.flash("danger", "You must Login !");
    return res.redirect("/login");
  }
  isLogin: req.session.isLogin;
  res.render("contact", {
    isLogin: req.session.isLogin,
    user: req.session.user,
  });
});

app.get("/detail/:id", upload.single("inputImage"), (req, res) => {
  if (!req.session.isLogin) {
    req.flash("danger", "You must Login !");
    return res.redirect("/login");
  }
  let id = req.params.id;
  let query = `SELECT * FROM tb_project WHERE id=${id}`;
  db.connect(function (err, client, done) {
    if (err) throw err;

    client.query(query, function (err, result) {
      if (err) throw err;
      done();
      let isLogin = req.session.isLogin;
      let data = result.rows[0];
      (data.start_date = getFullTime(data.start_date)),
        (data.end_date = getFullTime(data.end_date)),
        (data.duration = getDuration(data.start_date, data.end_date)),
        (data.vue = checkboxes(data.technologies[0])),
        (data.react = checkboxes(data.technologies[1])),
        (data.node = checkboxes(data.technologies[2])),
        (data.java = checkboxes(data.technologies[3])),
        res.render("project-detail", {
          blog: data,
          isLogin: isLogin,
          user: req.session.user,
        });
    });
  });
});

app.get("/delete/:id", (req, res) => {
  if (!req.session.isLogin) {
    req.flash("danger", "You must Login !");
    return res.redirect("/login");
  }
  let id = req.params.id;
  let query = `DELETE FROM tb_project WHERE id = ${id}`;

  db.connect(function (err, client, done) {
    if (err) throw err;

    client.query(query, function (err, result) {
      if (err) throw err;
      done();

      res.redirect("/home");
    });
  });
});

app.get("/edit/:id", (req, res) => {
  if (!req.session.isLogin) {
    req.flash("danger", "You must Login !");
    return res.redirect("/login");
  }
  let id = req.params.id;
  db.connect(function (err, client, done) {
    if (err) throw err;

    client.query(
      `SELECT * FROM tb_project WHERE id = ${id}`,
      function (err, result) {
        if (err) throw err;

        done();
        let data = result.rows[0];
        (data.start_date = getFullTime(data.start_date)),
          (data.end_date = getFullTime(data.end_date)),
          (data.duration = getDuration(data.start_date, data.end_date)),
          (data.vue = checkboxes(data.technologies[0])),
          (data.react = checkboxes(data.technologies[1])),
          (data.node = checkboxes(data.technologies[2])),
          (data.java = checkboxes(data.technologies[3])),
          res.render("edit-project", {
            edit: data,
            id,
            isLogin: req.session.isLogin,
            user: req.session.user,
          });
      }
    );
  });
});

app.post("/edit/:id", upload.single("inputImage"), (req, res) => {
  
  if (!req.file) {
    let data = req.body;
    let id = req.params.id;
    db.connect(function (err, client, done) {
      if (err) throw err;

      client.query(
        `UPDATE public.tb_project
        SET  name='${data.inputTitle}', start_date='${data.startDate}', end_date='${data.endDate}', description='${data.inputDesc}', technologies='{${data.vueJs},${data.nodeJs},${data.reactJs},${data.javaScript}}'
        WHERE id = ${id}`,
        function (err, result) {
          if (err) throw err;
          done();

          res.redirect("/home");
        }
      );
    });
  } else {
    let data = req.body;
    let id = req.params.id;

    db.connect(function (err, client, done) {
      if (err) throw err;

      client.query(
        `UPDATE public.tb_project
        SET  name='${data.inputTitle}', start_date='${data.startDate}', end_date='${data.endDate}', description='${data.inputDesc}', technologies='{${data.vueJs},${data.nodeJs},${data.reactJs},${data.javaScript}}',
        image='${req.file.filename}'
        WHERE id = ${id}`,
        function (err, result) {
          if (err) throw err;
          done();

          res.redirect("/home");
        }
      );
    });
  }
});

app.post("/add", upload.single("inputImage"), (req, res) => {
  let data = req.body;

  db.connect(function (err, client, done) {
    if (err) throw err;

    console.log(data);
    client.query(
      `INSERT INTO public.tb_project( name, start_date, end_date, description, technologies, image, author_id)
	VALUES ('${data.inputTitle}', '${data.sDate}', '${data.eDate}', '${
        data.inputDesc
      }', '{${data.vueJs || false},${data.nodeJs || false},${
        data.reactJs || false
      },${data.javaScript || false}}', '${req.file.filename}', '${
        req.session.user.id
      }')`,

      function (err, result) {
        if (err) throw err;
        done();

        res.redirect("home");
      }
    );
  });
});

app.get("/add", (req, res) => {
  if (!req.session.isLogin) {
    req.flash("danger", "You must Login !");
    return res.redirect("/login");
  }

  islogin: req.session.isLogin;
  res.render("add-project", {
    isLogin: req.session.isLogin,
    user: req.session.user,
  });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  let data = req.body;

  const hashedPassword = bcrypt.hashSync(data.inputPass, 10);

  db.connect(function (err, client, done) {
    if (err) throw err;
    client.query(
      ` SELECT * FROM tb_user WHERE email='${data.inputEmail}'`,
      function (err, result) {
        if (err) throw err;

        if (result.rows.length > 0) {
          req.flash("danger", "Email sudah terdaftar !");
          return res.redirect("/register");
        } else {
          client.query(
            `INSERT INTO tb_user( name, email, password) VALUES ( '${data.inputUser}', '${data.inputEmail}', '${hashedPassword}')`,
            function (err, result) {
              return res.redirect("/login");
            }
          );
        }
      }
    );
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  let data = req.body;

  db.connect(function (err, client, done) {
    if (err) throw err;

    client.query(
      `SELECT * FROM tb_user WHERE email='${data.inputEmail}'`,
      function (err, result) {
        if (err) throw err;
        done();

        if (result.rows.length == 0) {
          req.flash("danger", "Email not register !");
          return res.redirect("login");
        }

        const passMatch = bcrypt.compareSync(
          data.inputPass,
          result.rows[0].password
        );
        if (passMatch) {
          (req.session.isLogin = true),
            (req.session.user = {
              id: result.rows[0].id,
              name: result.rows[0].name,
              email: result.rows[0].email,
            });

          req.flash("succes", " Login Succes");
          res.redirect("/home");
        } else {
          req.flash("danger", "Wrong Password !");
          res.redirect("/login");
        }
      }
    );
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy();

  res.redirect("/login");
});

function getDuration(startDate, endDate) {
  let start = new Date(startDate);
  let end = new Date(endDate);
  let duration = end.getTime() - start.getTime();
  let year = Math.floor(duration / (1000 * 3600 * 24 * 30 * 12));
  let month = Math.round(duration / (1000 * 3600 * 24 * 30));
  let day = duration / (1000 * 3600 * 24);

  if (day < 30) {
    return day + " Day";
  } else if (month < 12) {
    return month + " Month";
  } else {
    return year + " Year";
  }
}

function checkboxes(condition) {
  if (condition == "true") {
    return true;
  } else {
    return false;
  }
}

function getFullTime(waktu) {
  let month = [
    "January",
    "Febuary",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "Sept",
    "October",
    "December",
  ];
  console.log(waktu);
  let date = waktu.getDate().toString().padStart(2, "0");

  // console.log(date);
  let monthIndex = (waktu.getMonth() + 1).toString().padStart(2, "0");

  // console.log(month[monthIndex]);

  let year = waktu.getFullYear();
  // console.log(year);

  let hours = waktu.getHours();
  let minutes = waktu.getMinutes();

  let fullTime = `${year}-${monthIndex}-${date}`;
  return fullTime;
}

// function dateConvert(date) {
//   date = new Date(date);
//   const dateString =
//     date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
//   return dateString;
// }

app.listen(port, () => {
  console.log(`server listen on port ${port}`);
});
