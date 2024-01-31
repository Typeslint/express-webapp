import crypto from "node:crypto";
import path from "node:path";
import bodyParser from "body-parser";
import { Client, Pool, QueryResult } from "pg";
import PGSession from "connect-pg-simple";
import axios, { AxiosError, AxiosResponse } from "axios";
import express, { NextFunction, Request, Response } from "express";
import session from "express-session";
import dotenv from "dotenv";
import { profileRes, responseRes, uploadPhotoProfile, userData, userMembership, userOrder, userPhoto } from "./interface";
import { defaultBackgroundPhoto, defaultProfilePhoto } from "./base-64";
dotenv.config();

const pg: Client = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: "root",
    database: "postgres"
});

const poolcfg: Pool = new Pool({
    connectionString: "postgres://postgres:root@localhost:5432/postgres"
});

pg.connect().then(async (): Promise<void> => {
    return console.log("Connecting PostgreSQL");
}).catch((err: Error) => {
    return console.error(err.message);
});

const app = express();
const PORT= 3000;
const pgSession = PGSession(session);

app.use(session({
    store: new pgSession({
        pool: poolcfg,
        tableName: "session",
        pruneSessionInterval: 120000
    }),
    unset: "destroy",
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        maxAge: 1800000
    }
}));

app.listen(PORT, (): void => {
    return console.info("Connecting to PORT " + PORT.toString());
});

app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true}));
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction): void => {
    if (req.session) {
        req.session.touch();
    }
    next();
});

app.use<void>("/register", express.static(path.join(__dirname, "../public/register")));

app.use<void>("/login", express.static(path.join(__dirname, "../public/login")));

app.use<void>("/home", express.static(path.join(__dirname, "../public/home")));

app.use<void>("/profile", express.static(path.join(__dirname, "../public/profile")));

app.use<void>("/order", express.static(path.join(__dirname, "../public/order")));

app.use<void>("/pay", express.static(path.join(__dirname, "../public/pay")));

app.get("/api/check", async (req: Request<unknown, never, never>, res: Response<unknown>): Promise<void> => {
    const urlAPI: string = "http://localhost:3000/api/profile";
    axios.get(urlAPI).then((data: AxiosResponse) => {
        res.status(200);
        return res.json({
            status: 200,
            message: "OK",
            axios: data.status.toLocaleString()
        });
    }).catch((err: AxiosError) => {
        res.status(400);
        return res.json({
            status: 400,
            message: "Bad Request",
            axios: err.response?.status.toLocaleString()
        });
    });
});

app.post("/api/profile/photo", async (req: Request<unknown, never, uploadPhotoProfile>, res: Response<responseRes | profileRes>): Promise<express.Response<profileRes> | void> => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    const bodyJSON: uploadPhotoProfile = JSON.parse(JSON.stringify(req.body));
    const photoProfile = bodyJSON.photo;
    const backgroundPhotoProfile = bodyJSON.backgroundPhoto;
    const username = req.session.username;

    if (username) {
        if (req.body.photo) {
            pg.query(`UPDATE "userphoto" SET photo='${photoProfile}' WHERE username=$1`, [username], (err: Error): express.Response<responseRes> | void => {
                if (!err) {
                    res.status(200);
                    return res.json({
                        status: 200,
                        message: "OK"
                    });
                } else {
                    res.status(406);
                    return res.json({
                        status: 406,
                        message: "Not Acceptable"
                    });
                }
            });
        } else if (req.body.backgroundPhoto) {
            pg.query(`UPDATE "userphoto" SET backgroundphoto='${backgroundPhotoProfile}' WHERE username=$1`, [username], (err: Error): express.Response<responseRes> | void => {
                if (!err) {
                    res.status(200);
                    return res.json({
                        status: 200,
                        message: "OK"
                    });
                } else {
                    res.status(406);
                    return res.json({
                        status: 406,
                        message: "Not Acceptable"
                    });
                }
            });
        } else {
            res.status(400);
            return res.json({
                status: 400,
                message: null
            });
        }
    } else {
        res.status(400);
        return res.json({
            status: 400,
            message: null
        });
    }
});

app.get("/api/profile", async (req: Request<unknown, never, never>, res: Response<responseRes | profileRes>): Promise<express.Response<profileRes> | void> => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    const username = req.session.username;
    if (req.session.username) {
        pg.query(`SELECT * FROM "userdb" WHERE username=$1`, [username], (err: Error, result: QueryResult<userData>): express.Response<profileRes> | void => {
            if (!err) {
                pg.query(`SELECT * FROM "membership" WHERE username=$1`, [username], (err: Error, membershipresult: QueryResult<userMembership>): express.Response<profileRes> | void => {
                    if (!err) {
                        pg.query(`SELECT * FROM "userphoto" WHERE username=$1`, [username], (err: Error, photoresult: QueryResult<userPhoto>): express.Response<profileRes> | void => {
                            if (!err) {
                                res.status(200);
                                return res.json({
                                    status: 200,
                                    message: "OK",
                                    username: result.rows[0].username,
                                    email: result.rows[0].email,
                                    alamat: result.rows[0].alamat,
                                    telp: result.rows[0].telp,
                                    is_member: membershipresult.rows[0].is_member,
                                    membership: membershipresult.rows[0].type,
                                    photo: photoresult.rows[0].photo,
                                    backgroundphoto: photoresult.rows[0].backgroundphoto
                                });
                            } else {
                                res.status(400);
                                return res.json({
                                    status: 400,
                                    message: "Bad Request"
                                });
                            }
                        });
                    } else {
                        res.status(400);
                        return res.json({
                            status: 400,
                            message: "Bad Request"
                        });
                    }
                });
            } else {
                res.status(400);
                return res.json({
                    status: 400,
                    message: "Bad Request"
                });
            }
        });
    } else {
        res.status(400);
        return res.json({
            status: 400,
            message: null
        });
    }
});

app.get("/api/logout", async (req: Request<unknown, never, unknown>, res: Response<responseRes>): Promise<express.Response<responseRes> | void> => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    if (req.session.username) {
        req.session.destroy(async () => {
            res.status(200);
            return res.json({
                status: 200,
                message: "Logout Success"
            });
        });
    } else {
        res.status(400);
        return res.json({
            status: 400,
            message: "Bad Request"
        });
    }
});

app.post("/api/logout", async (req: Request<unknown, never, unknown>, res: Response<responseRes>): Promise<express.Response<responseRes> | void> => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    if (req.session.username) {
        req.session.destroy(async () => {
            res.status(200);
            return res.json({
                status: 200,
                message: "Logout Success"
            });
        });
    } else {
        res.status(400);
        return res.json({
            status: 400,
            message: "Bad Request"
        });
    }
});

app.get("/api/riwayat-order", async (req: Request<unknown, never, unknown>, res: Response): Promise<express.Response<profileRes> | void> => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    const username = req.session.username;

    if (username) {
        pg.query(`SELECT * FROM "order" WHERE username=$1`, [username], (err: Error, result: QueryResult<userOrder>): express.Response | void => {
            if (!err) {
                const jsonData = [];
                for (let i = 0; i < result.rows.length; i++) {
                    jsonData.push(result.rows[i]);
                }
                res.status(200);
                return res.json({
                    status: 200,
                    message: "OK",
                    data: jsonData
                });
            } else {
                res.status(400);
                return res.json({
                    status: 400,
                    message: "Bad Request"
                });
            }
        });
    } else {
        res.status(400);
        return res.json({
            status: 400,
            message: "Bad Request"
        });
    }
});

app.post("/api/order", async (req: Request<unknown, never, userOrder>, res: Response<responseRes | unknown>): Promise<express.Response<responseRes> | void> => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    const bodyJSON: userOrder = JSON.parse(JSON.stringify(req.body));
    const username = req.session.username, name = bodyJSON.name, phone = bodyJSON.phone, address = bodyJSON.address, qty = bodyJSON.qty, service = bodyJSON.services.service, delivery = bodyJSON.services.delivery, total = bodyJSON.total, tanggal = bodyJSON.tanggal;

    if (req.session.username) {
        pg.query(`SELECT * FROM "userdb" WHERE username=$1`, [username], (err: Error, result: QueryResult<userData>): express.Response<responseRes> | void => {
            if (!err) {
                if (result.rows.find((a: userData) => a.username === username)) {
                    pg.query(`SELECT * FROM "order"`, (err: Error): void => {
                        if (!err) {
                            pg.query(`INSERT INTO "order"(username, name, phone, address, qty, services, delivery, total, tanggal) VALUES ('${username}', '${name}', '${phone}', '${address}', '${qty}', '${service}', '${delivery}', '${total}', '${tanggal}')`, (err: Error): express.Response<responseRes> | void => {
                                if (!err) {
                                    res.status(200);
                                    return res.json({
                                        status: 200,
                                        message: "OK"
                                    });
                                } else {
                                    res.status(406);
                                    return res.json({
                                        status: 406,
                                        message: "Not Acceptable"
                                    });
                                }
                            });
                        } else {
                            res.status(400);
                            res.send(err.message);
                        }
                    });
                } else {
                    res.status(400);
                    return res.json({
                        status: 400,
                        message: "Bad Request"
                    });
                }
            } else {
                res.status(400);
                return res.json({
                    status: 400,
                    message: "Bad Request"
                });
            }
        });
    } else {
        res.status(401);
        return res.json({
            status: 401,
            message: "Unauthorized"
        });
    }
});

app.post("/api/register", async (req: Request<unknown, never, userData>, res: Response<responseRes>): Promise<express.Response<responseRes> | void> => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "content-type");

    const bodyJSON: userData = JSON.parse(JSON.stringify(req.body));
    const username: string = bodyJSON.username as string, rawPassword = bodyJSON.password as string;
    const password: string = crypto.createHash("sha256").update(rawPassword).digest("hex");
    const isMember = "false", typeMember = "undefined";

    if (!req.session.username) {
        if (username && password) {
            pg.query(`SELECT * FROM "userdb" WHERE username=$1`, [username], (err: Error, result: QueryResult<userData>): express.Response<responseRes> | void => {
                if (!err) {
                    if (!result.rows.find((a: userData) => a.username === username)) {
                        pg.query(`INSERT INTO "userdb"(username, password) VALUES ('${username}', '${password}')`, (err: Error): express.Response<responseRes> | void => {
                            if (!err) {
                                pg.query(`SELECT * FROM "membership"`, (err: Error): express.Response<responseRes> | void => {
                                    if (!err) {
                                        pg.query(`INSERT INTO "membership"(username, is_member, type) VALUES ('${username}', ${isMember}, '${typeMember}')`, (err: Error): express.Response<responseRes> | void => {
                                            if (!err) {
                                                pg.query(`SELECT * FROM "userphoto"`, (err: Error): express.Response<responseRes> | void => {
                                                    if (!err) {
                                                        pg.query(`INSERT INTO "userphoto"(username, photo, backgroundphoto) VALUES ('${username}', '${defaultProfilePhoto}', '${defaultBackgroundPhoto}')`, (err: Error): express.Response<responseRes> | void => {
                                                            if (!err) {
                                                                res.status(200);
                                                                return res.json({
                                                                    status: 200,
                                                                    message: "OK"
                                                                });
                                                            } else {
                                                                console.error(err);
                                                                res.status(406);
                                                                return res.json({
                                                                    status: 406,
                                                                    message: "Not Acceptable"
                                                                });
                                                            }
                                                        });
                                                    } else {
                                                        res.status(400);
                                                        return res.json({
                                                            status: 400,
                                                            message: "Bad Request"
                                                        });
                                                    }
                                                });
                                            } else {
                                                res.status(400);
                                                return res.json({
                                                    status: 400,
                                                    message: "Bad Request"
                                                });
                                            }
                                        });
                                    } else {
                                        res.status(400);
                                        return res.json({
                                            status: 400,
                                            message: "Bad Request"
                                        });
                                    }
                                });
                            } else {
                                res.status(400);
                                return res.json({
                                    status: 400,
                                    message: "Bad Request"
                                });
                            }
                        });
                    } else {
                        console.error(err);
                        res.status(406);
                        return res.json({
                            status: 406,
                            message: "Not Acceptable"
                        });
                    }
                } else {
                    res.status(400);
                    return res.json({
                        status: 400,
                        message: "Bad Request"
                    });
                }
            });
        } else {
            res.status(400);
            return res.json({
                status: 400,
                message: "Bad Request"
            });
        }
    } else {
        res.status(401);
        return res.json({
            status: 401,
            message: "Kamu masih login menggunakan " + req.session.username
        });
    }

});

app.post("/api/login", async (req: Request<unknown, never, userData>, res: Response<responseRes>): Promise<express.Response<responseRes> | void> => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    const bodyJSON: userData = JSON.parse(JSON.stringify(req.body));
    const username: string = bodyJSON.username as string, rawPassword = bodyJSON.password as string;
    const password: string = crypto.createHash("sha256").update(rawPassword).digest("hex");

    if (!req.session.username) {
        pg.query(`SELECT * FROM "userdb" WHERE username=$1 AND password=$2`, [username, password], (err: Error, result: QueryResult<userData>): express.Response<responseRes> | void => {
            if (!err) {
                if (result.rows.find((a: userData) => a.username === username) && result.rows.find((a: userData) => a.password === password)) {
                    req.session.username = username;
                    res.status(200);
                    res.json({
                        status: 200,
                        message: "OK"
                    });
                } else {
                    res.status(406);
                    return res.json({
                        status: 406,
                        message: "Not Acceptable"
                    });
                }
            } else {
                console.error(err);
                res.status(400);
                return res.json({
                    status: 400,
                    message: "Bad Request"
                });
            }
        });
    } else {
        res.status(401);
        return res.json({
            status: 401,
            message: "Kamu masih login menggunakan " + req.session.username
        });
    }
});

app.post("/api/membership/delete", async (req: Request<unknown, never, userMembership>, res: Response<responseRes>): Promise<express.Response<responseRes> | void> => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "content-type");

    if (req.session.username) {
        pg.query(`SELECT * FROM "membership" WHERE username=$1`, [req.session.username], (err: Error, result: QueryResult<profileRes>): express.Response<responseRes> | void => {
            if (!err) {
                if (result.rows[0].is_member == true) {
                    pg.query(`UPDATE "membership" SET is_member=false WHERE username=$1`, [req.session.username], (err: Error) => {
                        if (!err) {
                            res.status(200);
                            res.json({
                                status: 200,
                                message: "OK"
                            });
                        } else {
                            res.status(400);
                            res.json({
                                status: 400,
                                message: "Bad Request"
                            });
                        }
                    });
                } else {
                    res.status(406);
                    return res.json({
                        status: 406,
                        message: "Not Acceptable"
                    });
                }
            } else {
                res.status(400);
                return res.json({
                    status: 400,
                    message: "Bad Request"
                });
            }
        });
    } else {
        res.status(401);
        return res.json({
            status: 401,
            message: "Unauthorized"
        });
    }

});

app.post("/api/membership", async (req: Request<unknown, never, userMembership>, res: Response<responseRes>): Promise<express.Response<responseRes> | void> => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    const bodyJSON: userMembership = JSON.parse(JSON.stringify(req.body));
    const membershipType = bodyJSON.type;

    if (req.session.username) {
        pg.query(`SELECT * FROM "membership" WHERE username=$1`, [req.session.username], (err: Error, result: QueryResult<profileRes>): express.Response<responseRes> | void => {
            if (!err) {
                pg.query(`UPDATE "membership" SET type='${membershipType}' WHERE username=$1`, [req.session.username], (err: Error) => {
                    if (!err) {
                        if (result.rows[0].is_member == false) {
                            pg.query(`UPDATE "membership" SET is_member=true WHERE username=$1`, [req.session.username], (err: Error) => {
                                if (!err) {
                                    res.status(200);
                                    res.json({
                                        status: 200,
                                        message: "OK"
                                    });
                                } else {
                                    res.status(400);
                                    res.json({
                                        status: 400,
                                        message: "Bad Request"
                                    });
                                }
                            });
                        } else {
                            res.status(202);
                            return res.json({
                                status: 202,
                                message: "Accepted"
                            });
                        }
                    } else {
                        res.status(400);
                        res.json({
                            status: 400,
                            message: "Bad Request"
                        });
                    }
                });
            } else {
                res.status(400);
                return res.json({
                    status: 400,
                    message: "Bad Request"
                });
            }
        });
    } else {
        res.status(401);
        return res.json({
            status: 401,
            message: "Unauthorized"
        });
    }

});

export default app;
