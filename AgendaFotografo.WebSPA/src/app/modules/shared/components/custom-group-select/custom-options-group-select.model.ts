export class CustomOptionsGroupSelect {
    constructor(
        public display: string,
        public options: {
            display: string;
            value: string;
        }[],
    ) { }
}