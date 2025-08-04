// src/Utils/HashIds.js

import Hashids from 'hashids';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_SALT_KEY = process.env.MY_SECRET_SALT_KEY || 'default-salt-key-fallback';
const MIN_HASH_LENGTH = 12;

class NodeHashIds {
    static _createHashidsInstance(salt) {
        return new Hashids(salt, MIN_HASH_LENGTH);
    }

    static encode(data, salt) {
        const effectiveSalt = salt || DEFAULT_SALT_KEY;
        const hashids = NodeHashIds._createHashidsInstance(effectiveSalt);
        const inputData = Array.isArray(data) ? data : [data];
        return hashids.encode(...inputData);
    }

    static decode(hash, salt) {
        const effectiveSalt = salt || DEFAULT_SALT_KEY;
        const hashids = NodeHashIds._createHashidsInstance(effectiveSalt);
        const decoded = hashids.decode(hash);
        return decoded.length > 0 ? decoded[0] : null;
    }

    static convertHashIds(dataArray, salt) {
        if (!dataArray || !Array.isArray(dataArray)) {
            return dataArray;
        }

        const effectiveSalt = salt || DEFAULT_SALT_KEY;
        const hashids = NodeHashIds._createHashidsInstance(effectiveSalt);

        return dataArray.map(item => {
            if (item && item.id !== undefined) {
                const newItem = {...item };
                newItem.ids = hashids.encode(newItem.id);
                delete newItem.id;
                return newItem;
            }
            return item;
        });
    }
}

export default NodeHashIds;