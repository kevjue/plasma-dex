import click
from plasma.client.client import Client


@click.command()
@click.option('--token_address', help="The ethereum address of the root chain smart contract", required=True)
def main(token_address):
    client = Client()

    utxos = client.get_utxos('0x0af467F2f6c20e3543B8a2a453e70DF034714aEB', token_address)
    print(utxos)


if __name__ == '__main__':
    main()
