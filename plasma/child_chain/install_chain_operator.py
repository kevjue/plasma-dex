import click
import os
import site

@click.command()
@click.option('--root_chain_address', help="The ethereum address of the root chain smart contract", required=True)
def main(root_chain_address):
    crontab_cmd = "printf '* * * * * ( cd %%s/plasma-dex/plasma/; env ROOT_CHAIN_ADDRESS=%s PYTHONPATH=%%s/plasma-dex %s/bin/pipenv run submit_block >> %%s/submitblockcron.output  2>>%%s/submitblockcron.err )\\n' $HOME $HOME $HOME $HOME | crontab" % (root_chain_address, site.USER_BASE)
    print(crontab_cmd)
    os.system(crontab_cmd)

    
if __name__ == '__main__':
    main()
