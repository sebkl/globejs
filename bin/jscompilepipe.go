
package main

import (
	"os"
	"fmt"
	"io/ioutil"
	"net/http"
	. "github.com/sebkl/gotojs"
)

func main() {
	bytes, err := ioutil.ReadAll(os.Stdin)
	if err != nil {
		panic(err)
	}
	fmt.Println(string(Minify(http.DefaultClient,bytes)))
}
