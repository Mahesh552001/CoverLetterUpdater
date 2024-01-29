"use strict";

const express = require("express");
const catalyst = require("zcatalyst-sdk-node");
var fileupload = require("express-fileupload");
const fs = require("fs");
const path = require("path");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");

const app = express();
app.use(express.json());
app.use(fileupload());

const upload = (req, res) => {
  let catalystApp = catalyst.initialize(req, {
    type: catalyst.type.applogic,
  });
  let filestore = catalystApp.filestore();
  let datastore = catalystApp.datastore();

  const folderId = 3171000000055080;

  var email = req.body.email;

  const tempFilePath = path.join("/tmp", email);
  fs.writeFileSync(tempFilePath, req.files.file.data);

  let config = {
    code: fs.createReadStream(tempFilePath),
    name: email + ".docx",
  };

  filestore
    .folder(folderId)
    .uploadFile(config)
    .then((result) => {
      datastore.table(3171000000055106).insertRow({
        email,
        fileId: result.id,
      });
      res.status(200).json(result);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
};

app.get("/fetch", (req, res) => {
  let catalystApp = catalyst.initialize(req, { type: catalyst.type.applogic });

  let table = catalystApp.datastore().table("data");

  var zcql = catalystApp.zcql();
  var email = req.query.email;
  let query = `SELECT email FROM data where email='${email}'`;
  zcql
    .executeZCQLQuery(query)
    .then((result) => {
      res.status(200).send(result);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Internal Server Error");
    });
});

app.post("/upload", (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    upload(req, res);
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/update", (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let catalystApp = catalyst.initialize(req, {
      type: catalyst.type.applogic,
    });

    var email = req.body.email;
    let zcql = catalystApp.zcql();

    let query = `select fileId FROM data where email='${email}'`;
    zcql
      .executeZCQLQuery(query)
      .then((result) => {
        zcql
          .executeZCQLQuery(`delete FROM data where email='${email}'`)
          .catch((err) => res.status(500).send("Internal Server Error"));
        let folder = catalystApp.filestore().folder(3171000000055080);
        folder.deleteFile(result[0].data.fileId).catch((err) => {
          console.log(err);
          res.status(500).send("Internal Server Error");
        });
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Internal Server Error");
      });
    upload(req, res);
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/generate", (req, res) => {
  try {
    let catalystApp = catalyst.initialize(req, {
      type: catalyst.type.applogic,
    });

    var email = req.body.email;
    let zcql = catalystApp.zcql();

    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

    let query = `select fileId FROM data where email='${email}'`;
    zcql
      .executeZCQLQuery(query)
      .then((result) => {
        catalystApp
          .filestore()
          .folder(3171000000055080)
          .downloadFile(result[0].data.fileId)
          .then((buf) => {
            const binaryData = new Uint8Array(buf).buffer;
            const doc = new Docxtemplater();
            const zip = new PizZip(binaryData);
            doc.loadZip(zip);
            const replacements = {
              RRRRR: req.body.roleName,
              CCCCC: req.body.companyName,
              LLLLL: req.body.companyLocation,
              DDDDD: formattedDate,
            };
            doc.setData(replacements);
            doc.render();
            const modifiedContent = doc
              .getZip()
              .generate({ type: "nodebuffer" });
            res.setHeader(
              "Content-Type",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            );
            res.setHeader(
              "Content-Disposition",
              "attachment; filename=modified_cover_letter.docx"
            );
            res.send(modifiedContent);
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({ error: "Internal server error." });
          });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: "Internal server error." });
      });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.all("/", (req, res) => {
  res.status(200).send("I am Live and Ready.");
});

module.exports = app;
