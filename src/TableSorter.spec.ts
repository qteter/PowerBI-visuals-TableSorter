/* tslint:disable */
import "essex.powerbi.base/spec/visualHelpers";
// import "../base/testSetup";
/* tslint:enable */

import { expect } from "chai";
import { TableSorter } from "./TableSorter";
import {
    ITableSorterSettings,
    ITableSorterRow,
    IDataProvider,
    ITableSorterConfiguration,
    IQueryResult,
} from "./models";
import * as $ from "jquery";
import { Promise } from "es6-promise";

describe("TableSorter", () => {
    let parentEle: JQuery;
    let instances: TableSorter[] = [];
    beforeEach(() => {
        parentEle = $("<div></div>");
    });

    afterEach(() => {
        instances.forEach(n => n.destroy());
        instances.length = 0;
        parentEle = undefined;
    });

    const getHeaders = () => {
        return parentEle.find(".header").toArray().reverse();
    };

    const getHeader = (colName: string) => {
        return $(getHeaders().filter((ele) => $(ele).is(`:contains('${colName}')`))[0]);
    };

    const getFilterEle = (colName: string) => {
        return getHeader(colName).find(".singleColumnFilter");
    };

    const getColumnValues = (col: string) => {
        const headerNames = getHeaders().map(n => $(n).find("title").text());
        const colIdx = headerNames.indexOf(col); // Returns the index that this header is in the list of headers
        // Find all the row values, and make sure they match
        return parentEle.find(".row")
            .map((i, ele) => $(ele).find(".text,.valueonly")[colIdx])
            .map((i, ele) => $(ele).text()).toArray();
    };

    let createInstance = () => {
        let ele = $("<div>");
        parentEle.append(ele);
        let result = {
            instance: new TableSorter(ele),
            element: ele,
        };

        // For cleaning up
        instances.push(result.instance);

        // result.instance.dimensions = { width: 800, height: 20000 };
        result.instance.settings = {
            presentation: {
                animation: false,
                values: true,
                numberFormatter: (n) => n + "",
            },
        };
        return result;
    };
    let testColumns = () => {
        return [{
            column: "col1",
            label: "Column",
            type: "string",
        }, {
            column: "col2",
            label: "Column2",
            type: "number",
        }, {
            column: "col3",
            label: "Column3",
            type: "number",
        }, ];
    };

    let createFakeData = () => {
        let rows: ITableSorterRow[] = [];
        for (let i = 0; i < 100; i++) {
            (function(myId: any) {
                rows.push(<any>{
                    id: myId, // id is absolutely, positively necessary, otherwise it renders stupidly
                    col1: myId,
                    col2: i * (Math.random() * 100),
                    col3: i,
                    selected: false,
                    equals: (other: any) => (myId) === other["col1"],
                });
            })("FAKE_" + i);
        }
        const cols = testColumns();
        return {
            data: rows,
            columns: cols,
            stringColumns: cols.filter(n => n.type === "string"),
            numberColumns: cols.filter(n => n.type === "number"),
        };
    };

    let createProvider = (data: any[]) => {
        let resolver: Function;
        let resolved = false;
        let fakeProvider = <IDataProvider>{
            canQuery(options: any) {
                return Promise.resolve(true);
            },
            generateHistogram() {
                return Promise.resolve([]);
            },
            query(options: any) {
                return new Promise((resolve2) => {
                    resolve2({
                        total: data.length,
                        results: data,
                        replace: true,
                    });
                    resolved = true;
                    setTimeout(function() {
                        resolver();
                    }, 0);
                });
            },
        };
        return {
            instanceInitialized : new Promise((resolve) => {
                resolver = resolve;
            }),
            provider: fakeProvider,
        };
    };

    let loadInstanceWithStackedColumns = () => {
        let { instance, element } = createInstance();
        let data = createFakeData();
        let providerInfo = createProvider(data.data);
        instance.dataProvider = providerInfo.provider;
        providerInfo.instanceInitialized.then(() => {
            let desc = {
                label: "STACKED_COLUMN",
                width: 10,
                children: [
                    { column: "col2", type: "number", weight: 100 }
                ],
            };
            let inst = instance.lineupImpl;
            inst.storage.addStackedColumn(desc);
            inst.headerUpdateRequired = true;
            inst.updateAll();
        });
        return {
            instance,
            element,
            data,
            instanceInitialized: providerInfo.instanceInitialized,
        };
    };

    const performClick = (e: JQuery) => {
        if (e.length === 0) {
            expect.fail(1, 0, "No elements found to click");
        }
        if (typeof MouseEvent !== "undefined") {
            /* tslint:disable */
            var ev = new Event("click", {"bubbles":true, "cancelable":false});
            e[0].dispatchEvent(ev);
            /* tslint:enable */
        } else {
            e.click();
        }
    };

    const setStringFilter = (colName: string, value: string) => {
        const filterEle = getFilterEle(colName);
        performClick(filterEle); // Normal .click() will not work with d3
        return new Promise((resolve, reject) => {
            const popup = parentEle.find(".lu-popup2");
            const inputEle = popup.find("input");
            inputEle.val(value);
            popup.find(".ok").click();
            setTimeout(resolve, 100);
        });
    };

    const setNumericalFilter = (colName: string, value: any) => {
        const filterEle = getFilterEle(colName);
        performClick(filterEle); // Normal .click() will not work with d3
        return new Promise((resolve, reject) => {
            const popup = parentEle.find(".lu-popup2");
            const inputEle = popup.find("input");
            inputEle.val(value);
            popup.find(".ok").click();
            setTimeout(resolve, 100);
        });
    };

    let loadInstanceWithData = () => {
        let { instance, element } = createInstance();
        instance.dimensions = { width: 800, height: 1000 };
        let data = createFakeData();
        let providerInfo = createProvider(data.data);
        instance.dataProvider = providerInfo.provider;
        return {
            instance,
            element,
            data,
            provider: providerInfo.provider,
            instanceInitialized: providerInfo.instanceInitialized,
        };
    };

    let loadInstanceWithStackedColumnsAndClick = () => {
        let { instance, element, data, instanceInitialized } = loadInstanceWithStackedColumns();

        instanceInitialized = instanceInitialized.then((result) => {
            let headerEle = element.find(".header:contains('STACKED_COLUMN')").find(".labelBG");
            performClick(headerEle);
            return result;
        });

        return {
            instance,
            element,
            data,
            instanceInitialized,
        };
    };

    let loadInstanceWithSettings = (settings: ITableSorterSettings) => {
        let { instance, element } = createInstance();
        let data = createFakeData();

        let { provider, instanceInitialized } = createProvider(data.data);

        instance.dataProvider = provider;

        // Set the settings
        instance.settings = $.extend(true, {}, settings, {
            presentation: {
                animation: false
            },
        });

        return {
            instance,
            element,
            instanceInitialized,
            data,
        };
    };

    let loadInstanceWithConfiguration = (config: ITableSorterConfiguration) => {
        let { instance, element } = createInstance();
        let data = createFakeData();
        let { provider, instanceInitialized } = createProvider(data.data);

        instance.configuration = config;
        instance.dataProvider = provider;

        return {
            instance,
            element,
            instanceInitialized,
            data,
        };
    };

    it("should load", function() {
        let { instance } = createInstance();
        expect(instance).to.not.be.undefined;
    });

    describe("settings", () => {
        it("should load some default settings on create", () => {
            let { instance } = createInstance();
            expect(instance.settings).to.not.be.undefined;
        });
        it("should load some merge new settings", () => {
            let { instance } = createInstance();
            let newSettings: ITableSorterSettings = {
                presentation: {
                    histograms: false
                },
            };

            // Set the new settings
            instance.settings = newSettings;

            // Make sure that something that wasn't touched is still there
            expect(instance.settings.presentation.values).to.equal(false);

            // Make sure our new value is still there
            expect(instance.settings.presentation.histograms).to.eq(false);
        });
        it("should pass rendering settings to lineupimpl", () => {
            let { instance, instanceInitialized } = loadInstanceWithSettings({
                presentation: {
                    histograms: false
                },
            });

            return instanceInitialized.then(() => {
                expect(instance.lineupImpl.config.renderingOptions.histograms).to.be.false;
            });
        });
    });

    describe("settings", () => {
        it("multiSelect should be true by default", () => {
            let { instance } = createInstance();
            expect(instance.settings.selection.multiSelect).to.be.false;
        });
        it("singleSelect should be true by default", () => {
            let { instance } = createInstance();
            expect(instance.settings.selection.singleSelect).to.be.true;
        });
    });

    describe("events", () => {

        describe("sortChanged", () => {
            it("should call the event when a column header is clicked", () => {
                let { instance, element } = createInstance();
                let called = false;
                instance.events.on(TableSorter.EVENTS.SORT_CHANGED, (item: any) => {
                    called = true;
                });
                let providerInfo = createProvider(createFakeData().data);
                instance.dataProvider = providerInfo.provider;
                return providerInfo.instanceInitialized.then(() => {
                    // Click on de header
                    let headerEle = element.find(".header:contains('col1')").find(".labelBG");
                    performClick(headerEle);

                    expect(called).to.be.true;
                });
            });

            it("should call the event with the correct params", () => {
                let { instance, element } = createInstance();
                instance.events.on(TableSorter.EVENTS.SORT_CHANGED, (colName: string) => {
                    expect(colName).to.equal("col1");
                });

                let providerInfo = createProvider(createFakeData().data);
                instance.dataProvider = providerInfo.provider;
                return providerInfo.instanceInitialized.then(() => {
                    // // Click on de header
                    let headerEle = element.find(".header:contains('col1')").find(".labelBG");
                    performClick(headerEle);
                });
            });
        });

        describe("selectionChanged", () => {
            it("should call the event when a row is clicked", () => {
                let { instance, element } = createInstance();
                let called = false;
                instance.events.on(TableSorter.EVENTS.SELECTION_CHANGED, (selection: any) => {
                    called = true;
                    expect(selection.length).to.be.equal(1);
                    expect(selection[0].col1).to.be.equal("FAKE_0"); // Very first row
                });

                let providerInfo = createProvider(createFakeData().data);
                instance.dataProvider = providerInfo.provider;
                return providerInfo.instanceInitialized.then(() => {
                    let row = element.find(".row").first();
                    performClick(row);
                    expect(called).to.be.true;
                });

            });
            it("should call the event when a row is clicked twice", () => {
                let { instance, element } = createInstance();

                let providerInfo = createProvider(createFakeData().data);
                instance.dataProvider = providerInfo.provider;
                return providerInfo.instanceInitialized.then(() => {
                    let row = element.find(".row").first();
                    performClick(row);

                    let called = false;
                    instance.events.on(TableSorter.EVENTS.SELECTION_CHANGED, (selection: any) => {
                        called = true;
                        expect(selection.length).to.be.equal(0);
                    });

                    performClick(row);

                    expect(called).to.be.true;
                });

            });
        });

        describe("selection", () => {
            describe("multi", () => {
                it("should update when a row is clicked on", () => {
                    let { instance, element } = createInstance();
                    let { data } = createFakeData();

                    let providerInfo = createProvider(createFakeData().data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.instanceInitialized.then(() => {
                        let row = element.find(".row").first();
                        performClick(row);

                        expect(instance.selection[0]["col1"]).to.be.equal(data[0]["col1"]);
                    });

                });

                it("should deselect a row that was selected twice", () => {
                    let { instance, element } = createInstance();

                    let providerInfo = createProvider(createFakeData().data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.instanceInitialized.then(() => {
                        let row = element.find(".row").first();
                        performClick(row);
                        performClick(row);

                        expect(instance.selection.length).to.be.equal(0);
                    });
                });

                it("should select multiple rows", () => {
                    let { instance, element } = loadInstanceWithSettings({
                        selection: {
                            singleSelect: false,
                            multiSelect: true,
                        },
                    });
                    let { data } = createFakeData();
                    let providerInfo = createProvider(data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.instanceInitialized.then(() => {
                        let rows = element.find(".row");
                        performClick($(rows[0]));
                        performClick($(rows[1]));

                        expect(instance.selection.length).to.be.equal(2);
                        expect(instance.selection.map((row) => row["col1"])).to.be.deep.equal(data.slice(0, 2).map((r) => r["col1"]));
                    });

                });

                it("should retain selection when set", () => {
                    let { instance } = createInstance();
                    let { data } = createFakeData();

                    let providerInfo = createProvider(createFakeData().data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.instanceInitialized.then(() => {
                        instance.selection = [data[0]];
                        expect(instance.selection[0]["col1"]).to.be.equal(data[0]["col1"]);
                    });
                });
            });

            describe("single", () => {
                let createInstanceWithSingleSelect = () => {
                    return loadInstanceWithSettings({
                        selection: {
                            singleSelect: true,
                            multiSelect: false,
                        },
                    });
                };
                it("should update when a row is clicked on", () => {
                    let { instance, element } = createInstanceWithSingleSelect();
                    let { data } = createFakeData();

                    let providerInfo = createProvider(createFakeData().data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.instanceInitialized.then(() => {
                        let row = element.find(".row").first();
                        performClick(row);

                        expect(instance.selection[0]["col1"]).to.be.equal(data[0]["col1"]);
                    });
                });

                it("should deselect a row that was selected twice", () => {
                    let { instance, element } = createInstanceWithSingleSelect();

                    let providerInfo = createProvider(createFakeData().data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.instanceInitialized.then(() => {
                        let row = element.find(".row").first();
                        performClick(row);
                        performClick(row);

                        expect(instance.selection.length).to.be.equal(0);
                    });
                });

                it("should select the last row when multiple rows are clicked", () => {
                    let { instance, element } = createInstanceWithSingleSelect();
                    let { data } = createFakeData();

                    let providerInfo = createProvider(data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.instanceInitialized.then(() => {

                        let rows = element.find(".row");
                        performClick($(rows[0]));
                        performClick($(rows[1]));

                        expect(instance.selection.length).to.be.equal(1);
                        expect(instance.selection[0]["col1"]).to.be.deep.equal(data[1]["col1"]);
                    });
                });

                it("should retain selection when set", () => {
                    let { instance } = createInstanceWithSingleSelect();
                    let { data } = createFakeData();

                    let providerInfo = createProvider(data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.instanceInitialized.then(() => {
                        instance.selection = [data[0]];
                        expect(instance.selection[0]["col1"]).to.be.equal(data[0]["col1"]);
                    });
                });
            });
        });

        describe("getSortFromLineUp", () => {
            it("does not crash when sorting a stacked column", () => {
                let {instance, instanceInitialized} = loadInstanceWithStackedColumnsAndClick();
                return instanceInitialized.then(() => {
                    expect(instance.getSortFromLineUp()).not.to.throw;
                });
            });

            it("returns a 'stack' property when a stack is cliked on", () => {
                let {instance, instanceInitialized} = loadInstanceWithStackedColumnsAndClick();
                return instanceInitialized.then(() => {
                    let result = instance.getSortFromLineUp();
                    expect(result.stack.name).to.equal("STACKED_COLUMN");
                    expect(result.column).to.be.undefined;
                });
            });
        });

        describe("integration", () => {
            it("saves the configuration when a stacked column is sorted", () => {
                let {instance, instanceInitialized} = loadInstanceWithStackedColumnsAndClick();
                return instanceInitialized.then(() => {
                    expect(instance.configuration.sort).to.not.be.undefined;
                    expect(instance.configuration.sort.stack.name).to.be.equal("STACKED_COLUMN");
                    expect(instance.configuration.sort.column).to.be.undefined;
                });
            });
            it("saves the configuration when the column layout has been changed", () => {
                let {instance, instanceInitialized } = loadInstanceWithStackedColumns();
                return instanceInitialized.then(() => {
                    let called = false;
                    instance.events.on(TableSorter.EVENTS.CONFIG_CHANGED, () => {
                        called = true;
                    });

                    // Ghetto: Manually say that the columns have changed, usually happens if you drag/drop add columns
                    instance.lineupImpl.listeners["columns-changed"]();

                    expect(called).to.be.true;
                });
            });
            it("loads lineup with a sorted stacked column", () => {
                let {instance, data, instanceInitialized } = loadInstanceWithStackedColumns();
                return instanceInitialized.then(() => {
                    instance.configuration = {
                        primaryKey: "col1",
                        columns: data.columns,
                        sort: {
                            stack: {
                                name: "STACKED_COLUMN"
                            },
                            asc: true,
                        },
                    };
                    let result = instance.getSortFromLineUp();
                    expect(result.stack.name).to.equal("STACKED_COLUMN");
                    expect(result.column).to.be.undefined;
                });
            });
            it("loads lineup with a filtered numerical column if it intially is filtered", () => {
                let { instance } = loadInstanceWithConfiguration({
                    primaryKey: "primary",
                    columns: testColumns(),
                    layout: {
                        primary: [{
                            column: "col3",
                            domain: [1, 1], // should just be a single column
                        }, ],
                    },
                });
                const q = instance.getQueryOptions().query;
                expect(q).to.be.deep.equal([{ column: "col3", value: { domain: [1, 1], range: undefined }}]);
            });
        });
    });

    it("should sort the data provider if the sort has changed in lineup", () => {
        let { data, instanceInitialized, provider, element } = loadInstanceWithData();
        const col = data.stringColumns[0];
        const colName = col.column;
        let called = false;
        return instanceInitialized
            .then(() => {
                provider.sort = (sort) => {
                    called = true;
                    expect(sort.column).to.be.equal(colName);
                    expect(sort.asc).to.be.true;
                };

                let headerEle = element.find(`.header:contains('${colName}')`).find(".labelBG");
                performClick(headerEle);
                expect(called).to.be.true;
            });
    });

    it("should filter the data provider if the filter has changed in lineup", () => {
        let { data, instanceInitialized, provider } = loadInstanceWithData();
        const col = data.stringColumns[0];
        const colName = col.column;
        const value = data.data[1][colName];

        let called = false;
        return instanceInitialized
            .then(() => {
                provider.filter = (filter) => {
                    called = true;
                    expect(filter.column).to.be.equal(colName);
                    expect(filter.value).to.be.equal(value);
                };
            })
            .then(() => setStringFilter(colName, value)) // Basically set the filter to the value in the second row
            .then(() => {
                expect(called).to.be.true;
            });
    });

    // it("should allow for the user filtering a numerical, and then allow for the user to scroll to load more data");
    it("should allow string column filtering through the UI", () => {
        let { data, instanceInitialized } = loadInstanceWithData();
        const col = data.stringColumns[0];
        const colName = col.column;
        const value = data.data[1][colName];
        return instanceInitialized
            .then(() => setStringFilter(colName, value)) // Basically set the filter to the value in the second row
            .then(() => getColumnValues(colName))
            .then((rowValues) => {
                expect(rowValues.length).to.be.gte(1);
                rowValues.forEach(n => expect(n).to.contain(value));
            });
    });

    xit("should allow numerical column filtering through the UI", () => {
        let { data, instanceInitialized } = loadInstanceWithData();
        const col = data.numberColumns[0];
        const colName = col.column;
        const value = data.data[1][colName];
        return instanceInitialized
            .then(() => setNumericalFilter(colName, value)) // Basically set the filter to the value in the second row
            .then(() => getColumnValues(colName))
            .then((rowValues) => {
                expect(rowValues.length).to.be.gte(1);
                rowValues.forEach(n => expect(n).to.be.equal(value));
            });
    });

    // it("should allow for the user filtering a numerical, and then allow for the user to scroll to load more data");
    it("should allow for infinite scrolling without a filter");
    it("should check to see if there is more data when infinite scrolling", (done) => {
        let { instanceInitialized, instance, provider, element } = loadInstanceWithData();
        return instanceInitialized
            .then(() => {
                provider.query = (() => {
                    expect.fail(true, false, "Should not be called");
                    done.fail();
                }) as any;

                let canQueryCalled = false;
                provider.canQuery = (options) => {
                    canQueryCalled = true;
                    return Promise.resolve(false);
                };

                // HACKY: This mimics a scroll event
                const scrollable = element.find(".lu-wrapper");
                scrollable.scrollTop(scrollable.height());
                instance.lineupImpl.scrolled();

                expect(canQueryCalled).to.be.true;
                done();
            });
    });

    // it("should allow for the user filtering a numerical, and then allow for the user to scroll to load more data");
    it("should check to see if there is more data when infinite scrolling and there is a filter", (done) => {
        let { data, instanceInitialized, provider, element, instance } = loadInstanceWithData();
        const col = data.stringColumns[0];
        const filterColName = col.column;
        const filterVal = data.data[1][filterColName];
        return instanceInitialized
            .then(() => setStringFilter(filterColName, filterVal)) // Basically set the filter to the value in the second row
            .then(() => {
                provider.query = (() => {
                    expect.fail(true, false, "Should not be called");
                    done.fail();
                }) as any;

                let canQueryCalled = false;
                provider.canQuery = (options) => {
                    canQueryCalled = true;
                    const filter = options.query.filter(n => n.column === filterColName)[0];
                    expect(filter).to.be.deep.equal({
                        column: filterColName,
                        value: filterVal,
                    });
                    return Promise.resolve(false);
                };

                // HACKY: This mimics a scroll event
                const scrollable = element.find(".lu-wrapper");
                scrollable.scrollTop(scrollable.height());
                instance.lineupImpl.scrolled();

                expect(canQueryCalled).to.be.true;
                done();
            });
    });

    it("should attempt to load more data when infinite scrolling", (done) => {
        let { instanceInitialized, instance, provider, element } = loadInstanceWithData();
        return instanceInitialized
            .then(() => {
                let queryCalled = false;
                provider.query = (() => {
                    queryCalled = true;
                    done();
                }) as any;

                provider.canQuery = (options) => {
                    return Promise.resolve(true);
                };

                // HACKY: This mimics a scroll event
                const scrollable = element.find(".lu-wrapper");
                scrollable.scrollTop(scrollable.height());
                instance.lineupImpl.scrolled();
            });
    });

    it("should replace data, if the DataProvider indicates that it is new data", (done) => {
        let { instanceInitialized, instance, provider, data } = loadInstanceWithData();
        const col = data.stringColumns[0];
        const filterColName = col.column;
        const filterVal = data.data[1][filterColName];
        return instanceInitialized
            .then(() => setStringFilter(filterColName, filterVal)) // Basically set the filter to the value in the second row
            .then(() => {
                let queryCalled = false;
                let resolved = false;
                provider.query = (() => {
                    queryCalled = true;
                    const newFakeData = createFakeData();
                    return new Promise<IQueryResult>(resolve => {
                        resolve({
                            replace: true,
                            results: newFakeData.data,
                        });

                        // SetTimeout is necessary because when you resolve, it doesn't immediately call listeners,
                        // it delays first.
                        setTimeout(() => {
                            expect(instance.data).to.be.deep.equal(newFakeData.data);
                            done();
                        }, 20);
                    });
                });

                provider.canQuery = (options) => {
                    let promise = Promise.resolve(!resolved);
                    resolved = true;
                    return promise;
                };
            });
    });

    it("should allow for infinite scrolling with a string filter");
    // it("should load a new set of data when a string column is filtered");
    it("should load a new set of data when a numerical column is filtered");
    it("should load a new set of data when a string column is sorted");
    it("should load a new set of data when a numerical column is sorted");
    it("should support stacked sorting");
    it("should support persisting of state, so after you reload it returns to its original state");
    it("should support persisting of state, so after you reload it returns to its original state: stacked");
    it("should support persisting of state, so after you reload it returns to its original state: sort");
    it("should support persisting of state, so after you reload it returns to its original state: filtering numerical");
    it("should support persisting of state, so after you reload it returns to its original state: filtering string");
    it("should support stacking columns, sorting them, then filtering another column");
    it("should allow for you to change the range of a numerical field, without freezing");
    it("should stack sort correctly asc");
    it("should stack sort correctly desc");
    it("should not go into an infinite loop if you just hit OK on a numerical filter without filtering.");
    it("should have numerical filter UI that is aligned properly");
    it("should have domains UI that is aligned properly"); // TSV
    it("should do nothing if the domains dialog does not change ANY value"); // TSV
    it("should update the configuration if the domains dialog changes ANY value"); // TSV
});
