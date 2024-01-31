declare module "express-session" {
    export interface SessionData {
        username: string;
    }
}

export interface responseRes {
    status: number;
    message?: string | undefined | null;
}

export interface userData {
    id: number | null;
    username: string;
    password: string;
    email: string;
    alamat: string;
    telp: string;
}

export interface userOrder {
    tanggal: string;
    id: number | null;
    username: string;
    name: string;
    phone: string;
    address: string;
    qty: string | number;
    services: {
        service: string;
        delivery: string;
    };
    total: string | number;
}

export interface userMembership {
    id: number | null;
    username: string;
    is_member: boolean;
    type: string;
}

export interface userPhoto {
    photo: string;
    backgroundphoto: string;
}

export interface uploadPhotoProfile {
    photo: string;
    backgroundPhoto: string;
}

export interface profileRes extends responseRes {
    username: string;
    photo: string;
    backgroundphoto: string;
    email: string;
    alamat: string;
    telp: string;
    is_member: boolean;
    membership: string;
}
