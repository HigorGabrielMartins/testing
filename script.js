const mysql = require('mysql2');
const express = require("express");
const cors = require("cors");
const mercadopago = require("mercadopago");
const axios = require('axios');
const app = express();

mercadopago.configure({
	access_token: "APP_USR-85930463362361-040715-ea6c0fbb1fc6bf3ebac313932580a7fa-487237549",
});
  
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());


async function ConectarDataBaseOrdens() {
	if(global.connection && global.connection.state !== 'disconnected')
		return global.connection;
	const connection = await mysql.createConnection(process.env.DATABASE_URL);
	console.log('[MySQL-Fatal] Conectado com sucesso!');
	global.connection = connection;
	return connection;
}

ConectarDataBaseOrdens(); 

app.post('/webhooks', (req, res) => {
	const checkX = req.query.data.id;
	axios({
	  method: 'GET',
	  headers:  {Authorization:'Bearer APP_USR-85930463362361-040715-ea6c0fbb1fc6bf3ebac313932580a7fa-487237549'},
	  url: `https://api.mercadopago.com/v1/payments/${checkX}`,
	}).then(function (response) {
		if(response.status == 'success') {
			switch(response.metadata.server) {
				case '1': { //Stars

				}
				case '2': { //Fatal
					InserirDbFatal(response.metadata.nick_server, response.metadata.quantia);
				}
				case '3': { //City

				}
			}
		}
	});

});

async function InserirDbFatal(name, moedas) {
	try {
		const conn = await ConectarDataBaseOrdens();
		const sql = 'INSERT INTO moedas_vip(name, moedas_vip_on) VALUES (?, ?);';
		const values =  [name, 1000 * moedas];
		conn.query(sql, values);
	} catch(e) {
		console.error(e);
	}
}

app.post('/create_ordem', (req, res) => {
	let preference = {
		items: [
			{
				title: "Moedas VIP",
				unit_price: 1,
				quantity: Number(req.body.user_quantia),
			}
		],
		notification_url: 'https://playstars.herokuapp.com/webhooks',
		metadata: {
			server: req.body.user_server,
			nick_server: req.body.user_nick,
			numero_zap: req.body.user_tel,
			quantia: req.body.user_quantia
		},
		payer: {
			name: req.body.user_name,
			email: req.body.user_email
		},
		back_urls: {
			"success": "https://playstars.herokuapp.com/feedback",
			"failure": "https://playstars.herokuapp.com/feedback",
			"pending": "https://playstars.herokuapp.com/feedback"
		},
		auto_return: "approved",
	};
	mercadopago.preferences.create(preference)
	.then(function (response) {
		res.json({
			id: response.body.id
		});
		console.log(response.body.id);
	}).catch(function (error) {
		console.log(error);
	});

});

app.get('/feedback', function(req, res) {
	res.json({
		Pagamento: req.query.payment_id,
		Status: req.query.status,
		Order: req.query.merchant_order_id
	});
});

app.listen(process.env.PORT, () => {
  console.log("Ta rodando....");
});
