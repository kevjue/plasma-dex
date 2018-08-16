import click
import os

@click.command()
@click.option('--root_chain_address', help="The ethereum address of the root chain smart contract", required=True)
def main(root_chain_address):
    crontab_cmd = "printf '* * * * * env ROOT_CHAIN_ADDRESS=0xf0708e689eedd522a807f4e2862138f5bed3de4c PYTHONPATH=%s/plasma-dex /usr/bin/python3 %s/plasma-dex/plasma/cli/cli.py submitblock D57C71EFC6B1E916350469B19FC59589FE5ADA98FB088EA5B300C8CF0BB645CD >> %s/submitblockcron.output  2>>%s/submitblockcron.err\n' $HOME $HOME $HOME $HOME | crontab"
    os.system(crontab_cmd)


if __name__ == '__main__':
    main()
