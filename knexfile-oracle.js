import oracledb from "oracledb";


const connIgrCRM = {
    client: "oracledb",
    connection: {
        user: "igrcrm",
        password: "igrcrm",
        connectString: "172.20.22.93:1521/igrcrm",
    },
};

const configDb = {
    client: "oracledb",
    connection: {
        user: "simckl",
        password: "simckl",
        connectString: "192.168.249.193:1521/simckl",
    },
};

export default {
    connIgrCRM,
};